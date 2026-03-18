const Cart = require('../models/Cart');
const Product = require('../models/Product');
const CompanyUser = require('../models/CompanyUser');

// @desc    Get user's cart
// @route   GET /api/cart
// @access  Private/Company Users
exports.getCart = async (req, res) => {
    try {
        let cart = await Cart.findOne({ user: req.user.id })
            .populate({
                path: 'items.product',
                select: 'productName sku brand price images category subCategory status approvalStatus',
                populate: [
                    { path: 'category', select: 'name' },
                    { path: 'subCategory', select: 'name' }
                ]
            });

        if (!cart) {
            // Create empty cart if doesn't exist
            cart = await Cart.create({
                user: req.user.id,
                company: req.user.companyId,
                items: []
            });
        }

        res.status(200).json({
            success: true,
            data: cart
        });
    } catch (error) {
        console.error('Get cart error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
};

// @desc    Add product to cart
// @route   POST /api/cart/add
// @access  Private/Company Users
exports.addToCart = async (req, res) => {
    try {
        const { productId, quantity = 1 } = req.body;

        // Validate input
        if (!productId) {
            return res.status(400).json({
                success: false,
                message: 'Product ID is required'
            });
        }

        if (quantity < 1) {
            return res.status(400).json({
                success: false,
                message: 'Quantity must be at least 1'
            });
        }

        // Check if product exists and is approved
        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Product not found'
            });
        }

        if (product.status !== 'active') {
            return res.status(400).json({
                success: false,
                message: 'Product is not available'
            });
        }

        if (product.approvalStatus !== 'approved') {
            return res.status(400).json({
                success: false,
                message: 'Product is not approved for ordering'
            });
        }

        // Find or create cart
        let cart = await Cart.findOne({ user: req.user.id });
        
        if (!cart) {
            cart = new Cart({
                user: req.user.id,
                company: req.user.companyId,
                items: []
            });
        }

        // Check if product already exists in cart
        const existingItemIndex = cart.items.findIndex(
            item => item.product.toString() === productId
        );

        if (existingItemIndex > -1) {
            // Update quantity if product exists
            cart.items[existingItemIndex].quantity += quantity;
        } else {
            // Add new item to cart
            cart.items.push({
                product: productId,
                quantity: quantity,
                price: product.price
            });
        }

        await cart.save();

        // Populate product details
        await cart.populate({
            path: 'items.product',
            select: 'productName sku brand price images category subCategory',
            populate: [
                { path: 'category', select: 'name' },
                { path: 'subCategory', select: 'name' }
            ]
        });

        res.status(200).json({
            success: true,
            message: 'Product added to cart successfully',
            data: cart
        });
    } catch (error) {
        console.error('Add to cart error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
};

// @desc    Remove product from cart
// @route   DELETE /api/cart/remove/:productId
// @access  Private/Company Users
exports.removeFromCart = async (req, res) => {
    try {
        const { productId } = req.params;

        const cart = await Cart.findOne({ user: req.user.id });

        if (!cart) {
            return res.status(404).json({
                success: false,
                message: 'Cart not found'
            });
        }

        // Filter out the product
        const initialLength = cart.items.length;
        cart.items = cart.items.filter(
            item => item.product.toString() !== productId
        );

        if (cart.items.length === initialLength) {
            return res.status(404).json({
                success: false,
                message: 'Product not found in cart'
            });
        }

        await cart.save();

        // Populate product details
        await cart.populate({
            path: 'items.product',
            select: 'productName sku brand price images category subCategory',
            populate: [
                { path: 'category', select: 'name' },
                { path: 'subCategory', select: 'name' }
            ]
        });

        res.status(200).json({
            success: true,
            message: 'Product removed from cart successfully',
            data: cart
        });
    } catch (error) {
        console.error('Remove from cart error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
};

// @desc    Update product quantity in cart (increment/decrement)
// @route   PATCH /api/cart/update/:productId
// @access  Private/Company Users
exports.updateCartItemQuantity = async (req, res) => {
    try {
        const { productId } = req.params;
        const { action, quantity } = req.body;

        // Validate action
        if (!action || !['increment', 'decrement', 'set'].includes(action)) {
            return res.status(400).json({
                success: false,
                message: 'Valid action is required (increment, decrement, or set)'
            });
        }

        const cart = await Cart.findOne({ user: req.user.id });

        if (!cart) {
            return res.status(404).json({
                success: false,
                message: 'Cart not found'
            });
        }

        // Find the item in cart
        const itemIndex = cart.items.findIndex(
            item => item.product.toString() === productId
        );

        if (itemIndex === -1) {
            return res.status(404).json({
                success: false,
                message: 'Product not found in cart'
            });
        }

        // Update quantity based on action
        if (action === 'increment') {
            cart.items[itemIndex].quantity += 1;
        } else if (action === 'decrement') {
            if (cart.items[itemIndex].quantity <= 1) {
                // Remove item if quantity would be 0
                cart.items.splice(itemIndex, 1);
            } else {
                cart.items[itemIndex].quantity -= 1;
            }
        } else if (action === 'set') {
            if (!quantity || quantity < 1) {
                return res.status(400).json({
                    success: false,
                    message: 'Quantity must be at least 1'
                });
            }
            cart.items[itemIndex].quantity = quantity;
        }

        await cart.save();

        // Populate product details
        await cart.populate({
            path: 'items.product',
            select: 'productName sku brand price images category subCategory',
            populate: [
                { path: 'category', select: 'name' },
                { path: 'subCategory', select: 'name' }
            ]
        });

        res.status(200).json({
            success: true,
            message: 'Cart updated successfully',
            data: cart
        });
    } catch (error) {
        console.error('Update cart item quantity error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
};

// @desc    Clear entire cart
// @route   DELETE /api/cart/clear
// @access  Private/Company Users
exports.clearCart = async (req, res) => {
    try {
        const cart = await Cart.findOne({ user: req.user.id });

        if (!cart) {
            return res.status(404).json({
                success: false,
                message: 'Cart not found'
            });
        }

        cart.items = [];
        await cart.save();

        res.status(200).json({
            success: true,
            message: 'Cart cleared successfully',
            data: cart
        });
    } catch (error) {
        console.error('Clear cart error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
};

module.exports = exports;
