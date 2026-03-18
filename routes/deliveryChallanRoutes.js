const express = require('express');
const router = express.Router();
const {
    createDeliveryChallan,
    getDeliveryChallanByOrderId,
    getVendorDeliveryChallans,
    getAllDeliveryChallans
} = require('../controllers/deliveryChallanController');
const { protect, authorize } = require('../middleware/authMiddleware');

// Protected routes that require authentication
router.use(protect);

// @route   POST /api/delivery-challan
// @desc    Create delivery challan for an order
// @access  Private/Vendor
router.post('/', createDeliveryChallan);

// @route   GET /api/delivery-challan/vendor/my-challans
// @desc    Get all delivery challans for vendor
// @access  Private/Vendor
router.get('/vendor/my-challans', getVendorDeliveryChallans);

// @route   GET /api/delivery-challan/admin/my-challans
// @desc    Get all delivery challans for admin direct sales
router.get('/admin/my-challans', authorize('admin', 'sub-admin'), getVendorDeliveryChallans);

// @route   GET /api/delivery-challan/all
// @desc    Get all delivery challans (admin and sub-admin)
// @access  Private/Admin, Sub-Admin
router.get('/all', authorize('admin', 'sub-admin'), getAllDeliveryChallans);

// @route   GET /api/delivery-challan/order/:orderId
// @desc    Get delivery challan by order ID
// @access  Private/Vendor & Admin
router.get('/order/:orderId', getDeliveryChallanByOrderId);

module.exports = router;
