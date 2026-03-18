const DeliveryPartner = require('../models/DeliveryPartner');
const Order = require('../models/Order');
const Invoice = require('../models/Invoice');

// @desc    Create delivery partner
// @route   POST /api/delivery-partners
// @access  Private/Admin, Sub-Admin
exports.createDeliveryPartner = async (req, res) => {
    try {
        const {
            name,
            email,
            phone,
            alternatePhone,
            vehicleType,
            vehicleNumber,
            drivingLicense,
            address
        } = req.body;

        // Check if delivery partner with email already exists
        const existingPartner = await DeliveryPartner.findOne({ email });
        if (existingPartner) {
            return res.status(400).json({
                success: false,
                message: 'Delivery partner with this email already exists'
            });
        }

        const deliveryPartner = await DeliveryPartner.create({
            name,
            email,
            phone,
            alternatePhone,
            vehicleType,
            vehicleNumber,
            drivingLicense,
            address,
            createdBy: req.user.id
        });

        res.status(201).json({
            success: true,
            message: 'Delivery partner created successfully',
            data: deliveryPartner
        });
    } catch (error) {
        console.error('Create delivery partner error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
};

// @desc    Get all delivery partners
// @route   GET /api/delivery-partners
// @access  Private/Admin, Sub-Admin
exports.getAllDeliveryPartners = async (req, res) => {
    try {
        const { isActive, vehicleType, page = 1, limit = 10 } = req.query;

        const filter = {};

        if (isActive !== undefined) {
            filter.isActive = isActive === 'true';
        }

        if (vehicleType) {
            filter.vehicleType = vehicleType;
        }

        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const skip = (pageNum - 1) * limitNum;

        const totalPartners = await DeliveryPartner.countDocuments(filter);

        const deliveryPartners = await DeliveryPartner.find(filter)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limitNum)
            .populate('createdBy', 'name email');

        const totalPages = Math.ceil(totalPartners / limitNum);

        res.status(200).json({
            success: true,
            count: deliveryPartners.length,
            totalPartners,
            totalPages,
            currentPage: pageNum,
            data: deliveryPartners,
            pagination: {
                page: pageNum,
                limit: limitNum,
                totalPages,
                totalRecords: totalPartners,
                hasNextPage: pageNum < totalPages,
                hasPrevPage: pageNum > 1
            }
        });
    } catch (error) {
        console.error('Get delivery partners error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
};

// @desc    Get delivery partner by ID
// @route   GET /api/delivery-partners/:id
// @access  Private/Admin, Sub-Admin
exports.getDeliveryPartnerById = async (req, res) => {
    try {
        const deliveryPartner = await DeliveryPartner.findById(req.params.id)
            .populate('createdBy', 'name email');

        if (!deliveryPartner) {
            return res.status(404).json({
                success: false,
                message: 'Delivery partner not found'
            });
        }

        res.status(200).json({
            success: true,
            data: deliveryPartner
        });
    } catch (error) {
        console.error('Get delivery partner error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
};

// @desc    Update delivery partner
// @route   PUT /api/delivery-partners/:id
// @access  Private/Admin, Sub-Admin
exports.updateDeliveryPartner = async (req, res) => {
    try {
        const {
            name,
            email,
            phone,
            alternatePhone,
            vehicleType,
            vehicleNumber,
            drivingLicense,
            address,
            isActive,
            rating
        } = req.body;

        let deliveryPartner = await DeliveryPartner.findById(req.params.id);

        if (!deliveryPartner) {
            return res.status(404).json({
                success: false,
                message: 'Delivery partner not found'
            });
        }

        // Check if email is being changed and if it's already taken
        if (email && email !== deliveryPartner.email) {
            const existingPartner = await DeliveryPartner.findOne({ email });
            if (existingPartner) {
                return res.status(400).json({
                    success: false,
                    message: 'Email already in use by another delivery partner'
                });
            }
        }

        // Update fields
        if (name) deliveryPartner.name = name;
        if (email) deliveryPartner.email = email;
        if (phone) deliveryPartner.phone = phone;
        if (alternatePhone !== undefined) deliveryPartner.alternatePhone = alternatePhone;
        if (vehicleType) deliveryPartner.vehicleType = vehicleType;
        if (vehicleNumber) deliveryPartner.vehicleNumber = vehicleNumber;
        if (drivingLicense) deliveryPartner.drivingLicense = drivingLicense;
        if (address) deliveryPartner.address = { ...deliveryPartner.address, ...address };
        if (isActive !== undefined) deliveryPartner.isActive = isActive;
        if (rating !== undefined) deliveryPartner.rating = rating;

        await deliveryPartner.save();

        res.status(200).json({
            success: true,
            message: 'Delivery partner updated successfully',
            data: deliveryPartner
        });
    } catch (error) {
        console.error('Update delivery partner error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
};

// @desc    Delete delivery partner
// @route   DELETE /api/delivery-partners/:id
// @access  Private/Admin, Sub-Admin
exports.deleteDeliveryPartner = async (req, res) => {
    try {
        const deliveryPartner = await DeliveryPartner.findById(req.params.id);

        if (!deliveryPartner) {
            return res.status(404).json({
                success: false,
                message: 'Delivery partner not found'
            });
        }

        // Check if delivery partner has active assignments
        const activeOrders = await Order.countDocuments({
            deliveryPartner: req.params.id,
            status: { $in: ['processing', 'shipped'] }
        });

        if (activeOrders > 0) {
            return res.status(400).json({
                success: false,
                message: `Cannot delete delivery partner with ${activeOrders} active deliveries. Please reassign or complete them first.`
            });
        }

        await deliveryPartner.deleteOne();

        res.status(200).json({
            success: true,
            message: 'Delivery partner deleted successfully'
        });
    } catch (error) {
        console.error('Delete delivery partner error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
};

// @desc    Assign delivery partner to order
// @route   PUT /api/delivery-partners/assign/:orderId
// @access  Private/Admin, Sub-Admin
exports.assignDeliveryPartner = async (req, res) => {
    try {
        const { orderId } = req.params;
        const { deliveryPartnerId } = req.body;

        if (!deliveryPartnerId) {
            return res.status(400).json({
                success: false,
                message: 'Please provide delivery partner ID'
            });
        }

        // Check if order exists
        const order = await Order.findById(orderId);
        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        // Check if delivery partner exists and is active
        const deliveryPartner = await DeliveryPartner.findById(deliveryPartnerId);
        if (!deliveryPartner) {
            return res.status(404).json({
                success: false,
                message: 'Delivery partner not found'
            });
        }

        if (!deliveryPartner.isActive) {
            return res.status(400).json({
                success: false,
                message: 'Delivery partner is not active'
            });
        }

        // Check if order payment is completed
        if (!order.payment || order.payment.paymentStatus !== 'completed') {
            return res.status(400).json({
                success: false,
                message: 'Cannot assign delivery partner. Order payment is pending.'
            });
        }

        // Check if order is approved by vendor
        if (order.vendorApprovalStatus !== 'approved') {
            return res.status(400).json({
                success: false,
                message: 'Cannot assign delivery partner. Order is not yet approved by vendor.'
            });
        }

        // Update order with delivery partner
        const wasAlreadyAssigned = !!order.deliveryPartner;
        const previousPartnerId = order.deliveryPartner;

        order.deliveryPartner = deliveryPartnerId;
        order.deliveryAssignedBy = req.user.id;
        order.deliveryAssignedAt = Date.now();

        // Update order status if not already in delivery
        if (order.status === 'pending' || order.status === 'approved') {
            order.status = 'processing';
        }

        await order.save();

        // Update delivery counts
        if (wasAlreadyAssigned && previousPartnerId.toString() !== deliveryPartnerId) {
            // Decrease count for previous partner
            await DeliveryPartner.findByIdAndUpdate(previousPartnerId, {
                $inc: { totalDeliveries: -1 }
            });
        }

        if (!wasAlreadyAssigned || previousPartnerId.toString() !== deliveryPartnerId) {
            // Increase count for new partner
            await DeliveryPartner.findByIdAndUpdate(deliveryPartnerId, {
                $inc: { totalDeliveries: 1 }
            });
        }

        // Populate order details
        await order.populate([
            { path: 'deliveryPartner', select: 'name phone vehicleType vehicleNumber' },
            { path: 'deliveryAssignedBy', select: 'name email' },
            { path: 'company', select: 'name email companyLocation' },
            { path: 'branch', select: 'branchName address city state' }
        ]);

        res.status(200).json({
            success: true,
            message: wasAlreadyAssigned ? 'Delivery partner reassigned successfully' : 'Delivery partner assigned successfully',
            data: order
        });
    } catch (error) {
        console.error('Assign delivery partner error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
};

// @desc    Remove delivery partner from order
// @route   DELETE /api/delivery-partners/assign/:orderId
// @access  Private/Admin, Sub-Admin
exports.removeDeliveryPartner = async (req, res) => {
    try {
        const { orderId } = req.params;

        const order = await Order.findById(orderId);
        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        if (!order.deliveryPartner) {
            return res.status(400).json({
                success: false,
                message: 'No delivery partner assigned to this order'
            });
        }

        const previousPartnerId = order.deliveryPartner;

        // Remove delivery partner assignment
        order.deliveryPartner = undefined;
        order.deliveryAssignedBy = undefined;
        order.deliveryAssignedAt = undefined;

        await order.save();

        // Decrease delivery count
        await DeliveryPartner.findByIdAndUpdate(previousPartnerId, {
            $inc: { totalDeliveries: -1 }
        });

        res.status(200).json({
            success: true,
            message: 'Delivery partner removed from order',
            data: order
        });
    } catch (error) {
        console.error('Remove delivery partner error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
};

// @desc    Get orders assigned to a delivery partner
// @route   GET /api/delivery-partners/:id/orders
// @access  Private/Admin, Sub-Admin
exports.getDeliveryPartnerOrders = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, page = 1, limit = 10 } = req.query;

        const deliveryPartner = await DeliveryPartner.findById(id);
        if (!deliveryPartner) {
            return res.status(404).json({
                success: false,
                message: 'Delivery partner not found'
            });
        }

        const filter = { deliveryPartner: id };

        if (status) {
            filter.status = status;
        }

        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const skip = (pageNum - 1) * limitNum;

        const totalOrders = await Order.countDocuments(filter);

        const orders = await Order.find(filter)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limitNum)
            .populate('company', 'name email companyLocation')
            .populate('branch', 'branchName address city state')
            .populate('orderedBy', 'name email phone')
            .populate('deliveryAssignedBy', 'name email');

        const totalPages = Math.ceil(totalOrders / limitNum);

        res.status(200).json({
            success: true,
            deliveryPartner: {
                name: deliveryPartner.name,
                phone: deliveryPartner.phone,
                vehicleType: deliveryPartner.vehicleType,
                vehicleNumber: deliveryPartner.vehicleNumber
            },
            count: orders.length,
            totalOrders,
            data: orders,
            pagination: {
                page: pageNum,
                limit: limitNum,
                totalPages,
                totalRecords: totalOrders,
                hasNextPage: pageNum < totalPages,
                hasPrevPage: pageNum > 1
            }
        });
    } catch (error) {
        console.error('Get delivery partner orders error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
};

module.exports = exports;
