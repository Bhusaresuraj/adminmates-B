const DeliveryChallan = require('../models/DeliveryChallan');
const Order = require('../models/Order');
const User = require('../models/User');

// @desc    Create delivery challan for an order
// @route   POST /api/delivery-challan
// @access  Private/Vendor
exports.createDeliveryChallan = async (req, res) => {
    try {
        const { orderId, notes } = req.body;

        // Check if user is a vendor
        if (req.user.role !== 'vendor') {
            return res.status(403).json({
                success: false,
                message: 'Access denied. Only vendors can create delivery challans.'
            });
        }

        if (!orderId) {
            return res.status(400).json({
                success: false,
                message: 'Order ID is required'
            });
        }

        // Find the order and populate product details
        const order = await Order.findById(orderId).populate('items.product');

        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        // Check if this order belongs to this vendor
        if (order.vendor.toString() !== req.user.id) {
            return res.status(403).json({
                success: false,
                message: 'You are not authorized to create delivery challan for this order'
            });
        }

        // Check if order is vendor approved
        if (order.vendorApprovalStatus !== 'approved') {
            return res.status(400).json({
                success: false,
                message: 'Delivery challan can only be created for vendor-approved orders'
            });
        }

        // Check if delivery challan already exists for this order
        const existingChallan = await DeliveryChallan.findOne({ order: orderId });
        if (existingChallan) {
            return res.status(400).json({
                success: false,
                message: 'Delivery challan already exists for this order',
                data: existingChallan
            });
        }

        // Prepare challan items from order items
        const challanItems = order.items.map(item => ({
            product: item.product._id,
            productName: item.productName,
            sku: item.sku,
            quantity: item.quantity,
            pricePerUnit: item.price,
            totalPrice: item.totalPrice
        }));

        // Calculate subtotal
        const subtotal = challanItems.reduce((sum, item) => sum + item.totalPrice, 0);

        // Create delivery challan
        const deliveryChallan = await DeliveryChallan.create({
            order: orderId,
            vendor: req.user.id,
            company: order.company,
            items: challanItems,
            subtotal: subtotal,
            notes: notes
        });

        // Populate delivery challan details
        await deliveryChallan.populate([
            { path: 'order', select: 'orderNumber status vendorApprovalStatus totalAmount' },
            { path: 'vendor', select: 'name email vendorLocation' },
            { path: 'company', select: 'name email companyLocation' },
            { path: 'items.product', select: 'productName sku brand images' }
        ]);

        res.status(201).json({
            success: true,
            message: 'Delivery challan created successfully',
            data: deliveryChallan
        });
    } catch (error) {
        console.error('Create delivery challan error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
};

// @desc    Get delivery challan by order ID
// @route   GET /api/delivery-challan/order/:orderId
// @access  Private/Vendor & Admin
exports.getDeliveryChallanByOrderId = async (req, res) => {
    try {
        const { orderId } = req.params;

        // Check if user is vendor, admin, or sub-admin
        if (req.user.role !== 'vendor' && req.user.role !== 'admin' && req.user.role !== 'sub-admin') {
            return res.status(403).json({
                success: false,
                message: 'Access denied. Only vendors, admins, and sub-admins can view delivery challans.'
            });
        }

        const deliveryChallan = await DeliveryChallan.findOne({ order: orderId })
            .populate('order', 'orderNumber status vendorApprovalStatus totalAmount createdAt')
            .populate('vendor', 'name email vendorLocation')
            .populate('company', 'name email companyLocation')
            .populate('items.product', 'productName sku brand images category subCategory');

        if (!deliveryChallan) {
            return res.status(404).json({
                success: false,
                message: 'Delivery challan not found for this order'
            });
        }

        // If user is vendor, check if they own this delivery challan
        if (req.user.role === 'vendor' && deliveryChallan.vendor._id.toString() !== req.user.id) {
            return res.status(403).json({
                success: false,
                message: 'You are not authorized to view this delivery challan'
            });
        }

        res.status(200).json({
            success: true,
            data: deliveryChallan
        });
    } catch (error) {
        console.error('Get delivery challan error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
};

// @desc    Get all delivery challans for vendor
// @route   GET /api/delivery-challan/vendor/my-challans
// @access  Private/Vendor
exports.getVendorDeliveryChallans = async (req, res) => {
    try {
        const { status, page = 1, limit = 10 } = req.query;

        // Check if user is a vendor
        if (req.user.role !== 'vendor') {
            return res.status(403).json({
                success: false,
                message: 'Access denied. Only vendors can access this endpoint.'
            });
        }

        // Build filter
        const filter = {
            vendor: req.user.id
        };

        if (status && ['pending', 'delivered', 'cancelled'].includes(status)) {
            filter.status = status;
        }

        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const skip = (pageNum - 1) * limitNum;

        const totalChallans = await DeliveryChallan.countDocuments(filter);

        const deliveryChallans = await DeliveryChallan.find(filter)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limitNum)
            .populate('order', 'orderNumber status vendorApprovalStatus totalAmount createdAt')
            .populate('vendor', 'name email vendorLocation')
            .populate('company', 'name email companyLocation')
            .populate('items.product', 'productName sku brand images');

        const totalPages = Math.ceil(totalChallans / limitNum);

        res.status(200).json({
            success: true,
            count: deliveryChallans.length,
            totalChallans,
            totalPages,
            currentPage: pageNum,
            data: deliveryChallans,
            pagination: {
                page: pageNum,
                limit: limitNum,
                totalPages,
                totalRecords: totalChallans,
                hasNextPage: pageNum < totalPages,
                hasPrevPage: pageNum > 1
            }
        });
    } catch (error) {
        console.error('Get vendor delivery challans error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
};

// @desc    Get all delivery challans (admin only)
// @route   GET /api/delivery-challan/all
// @access  Private/Admin
exports.getAllDeliveryChallans = async (req, res) => {
    try {
        const { status, vendorId, page = 1, limit = 10 } = req.query;

        // Check if user is admin or sub-admin
        if (req.user.role !== 'admin' && req.user.role !== 'sub-admin') {
            return res.status(403).json({
                success: false,
                message: 'Access denied. Only admins and sub-admins can access this endpoint.'
            });
        }

        // Build filter
        const filter = {};

        if (status && ['pending', 'delivered', 'cancelled'].includes(status)) {
            filter.status = status;
        }

        if (vendorId) {
            filter.vendor = vendorId;
        }

        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const skip = (pageNum - 1) * limitNum;

        const totalChallans = await DeliveryChallan.countDocuments(filter);

        const deliveryChallans = await DeliveryChallan.find(filter)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limitNum)
            .populate('order', 'orderNumber status vendorApprovalStatus totalAmount createdAt')
            .populate('vendor', 'name email vendorLocation')
            .populate('company', 'name email companyLocation')
            .populate('items.product', 'productName sku brand images');

        const totalPages = Math.ceil(totalChallans / limitNum);

        res.status(200).json({
            success: true,
            count: deliveryChallans.length,
            totalChallans,
            totalPages,
            currentPage: pageNum,
            data: deliveryChallans,
            pagination: {
                page: pageNum,
                limit: limitNum,
                totalPages,
                totalRecords: totalChallans,
                hasNextPage: pageNum < totalPages,
                hasPrevPage: pageNum > 1
            }
        });
    } catch (error) {
        console.error('Get all delivery challans error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
};

module.exports = exports;
