const express = require('express');
const router = express.Router();
const {
    placeOrder,
    verifyPayment,
    checkPaymentStatus,
    createEscalation,
    getReceivedEscalations,
    getSentEscalations,
    approveEscalation,
    rejectEscalation,
    getAllOrders,
    getOrderById,
    getVendorOrders,
    approveVendorOrder,
    rejectVendorOrder,
    adminRejectOrder
} = require('../controllers/orderController');
const { protect, authorize, authorizeCompanyUser, authorizeCompanyRole } = require('../middleware/authMiddleware');

// Protected routes that require authentication
router.use(protect);

// Company user specific routes (require company user authentication)
// @route   POST /api/orders/place
// @desc    Place order from cart
// @access  Private/Company Users
router.post('/place', authorizeCompanyUser, placeOrder);

// @route   POST /api/orders/verify-payment
// @desc    Verify payment and complete order
// @access  Private/Company Users
router.post('/verify-payment', authorizeCompanyUser, verifyPayment);

// @route   POST /api/orders/escalate
// @desc    Create escalation request
// @access  Private/Company Users (user and company-admin only)
router.post('/escalate', authorizeCompanyUser, authorizeCompanyRole('user', 'company-admin'), createEscalation);

// @route   GET /api/orders/escalations/received
// @desc    Get escalation requests received by me
// @access  Private/Company Admin, Super-Admin
router.get('/escalations/received', authorizeCompanyUser, authorizeCompanyRole('company-admin', 'super-admin'), getReceivedEscalations);

// @route   GET /api/orders/escalations/sent
// @desc    Get escalation requests sent by me
// @access  Private/Company Users
router.get('/escalations/sent', authorizeCompanyUser, getSentEscalations);

// @route   PUT /api/orders/escalations/:escalationId/approve
// @desc    Approve escalation and place order
// @access  Private/Company Admin, Super-Admin
router.put('/escalations/:escalationId/approve', authorizeCompanyUser, authorizeCompanyRole('company-admin', 'super-admin'), approveEscalation);

// @route   PUT /api/orders/escalations/:escalationId/reject
// @desc    Reject escalation
// @access  Private/Company Admin, Super-Admin
router.put('/escalations/:escalationId/reject', authorizeCompanyUser, authorizeCompanyRole('company-admin', 'super-admin'), rejectEscalation);

// Vendor specific routes
// @route   GET /api/orders/vendor/my-orders
// @desc    Get orders for vendor's products
// @access  Private/Vendor
router.get('/vendor/my-orders', getVendorOrders);

// @route   PUT /api/orders/vendor/:orderId/approve
// @desc    Approve vendor order and create payment
// @access  Private/Vendor
router.put('/vendor/:orderId/approve', approveVendorOrder);

// @route   PUT /api/orders/vendor/:orderId/reject
// @desc    Reject vendor order
// @access  Private/Vendor
router.put('/vendor/:orderId/reject', rejectVendorOrder);

// Admin Direct Sales specific routes (Separated from Vendor flow)
// @route   GET /api/orders/admin/my-orders
router.get('/admin/my-orders', authorize('admin', 'sub-admin'), getVendorOrders);

// @route   PUT /api/orders/admin/my-orders/:orderId/approve
router.put('/admin/my-orders/:orderId/approve', authorize('admin', 'sub-admin'), approveVendorOrder);

// @route   PUT /api/orders/admin/my-orders/:orderId/reject
router.put('/admin/my-orders/:orderId/reject', authorize('admin', 'sub-admin'), rejectVendorOrder);

// @route   PUT /api/orders/admin/:orderId/reject-order
// @desc    Admin explicitly rejects any global order
router.put('/admin/:orderId/reject-order', authorize('admin', 'sub-admin'), adminRejectOrder);

// Routes accessible by both admin/sub-admin and company users
// @route   GET /api/orders
// @desc    Get all orders with filters (role-based filtering applied in controller)
// @access  Private/All authenticated users (admin, sub-admin, company users)
router.get('/', getAllOrders);

// @route   GET /api/orders/:orderId/payment-status
// @desc    Check payment status
// @access  Private/All authenticated users
router.get('/:orderId/payment-status', checkPaymentStatus);

// @route   GET /api/orders/:orderId
// @desc    Get order by ID
// @access  Private/All authenticated users
router.get('/:orderId', getOrderById);

module.exports = router;
