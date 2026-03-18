const express = require('express');
const router = express.Router();
const {
    createDeliveryPartner,
    getAllDeliveryPartners,
    getDeliveryPartnerById,
    updateDeliveryPartner,
    deleteDeliveryPartner,
    assignDeliveryPartner,
    removeDeliveryPartner,
    getDeliveryPartnerOrders
} = require('../controllers/deliveryPartnerController');
const { protect, authorize } = require('../middleware/authMiddleware');

// All routes require authentication and admin/sub-admin role
router.use(protect);
router.use(authorize('admin', 'sub-admin'));

// @route   POST /api/delivery-partners
// @desc    Create delivery partner
// @access  Private/Admin, Sub-Admin
router.post('/', createDeliveryPartner);

// @route   GET /api/delivery-partners
// @desc    Get all delivery partners
// @access  Private/Admin, Sub-Admin
router.get('/', getAllDeliveryPartners);

// @route   GET /api/delivery-partners/:id
// @desc    Get delivery partner by ID
// @access  Private/Admin, Sub-Admin
router.get('/:id', getDeliveryPartnerById);

// @route   PUT /api/delivery-partners/:id
// @desc    Update delivery partner
// @access  Private/Admin, Sub-Admin
router.put('/:id', updateDeliveryPartner);

// @route   DELETE /api/delivery-partners/:id
// @desc    Delete delivery partner
// @access  Private/Admin, Sub-Admin
router.delete('/:id', deleteDeliveryPartner);

// @route   PUT /api/delivery-partners/assign/:orderId
// @desc    Assign delivery partner to order
// @access  Private/Admin, Sub-Admin
router.put('/assign/:orderId', assignDeliveryPartner);

// @route   DELETE /api/delivery-partners/assign/:orderId
// @desc    Remove delivery partner from order
// @access  Private/Admin, Sub-Admin
router.delete('/assign/:orderId', removeDeliveryPartner);

// @route   GET /api/delivery-partners/:id/orders
// @desc    Get orders assigned to a delivery partner
// @access  Private/Admin, Sub-Admin
router.get('/:id/orders', getDeliveryPartnerOrders);

module.exports = router;
