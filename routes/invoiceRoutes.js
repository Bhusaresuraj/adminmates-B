const express = require('express');
const router = express.Router();
const {
    createInvoice,
    getInvoiceById,
    getInvoiceByOrderId,
    getAllInvoices,
    verifyInvoicePayment,
    deleteInvoice
} = require('../controllers/invoiceController');
const { protect, authorize } = require('../middleware/authMiddleware');

// Protected routes that require authentication
router.use(protect);

// @route   POST /api/invoices
// @desc    Create invoice for an order
// @access  Private/Admin, Sub-Admin
router.post('/', authorize('admin', 'sub-admin'), createInvoice);

// @route   POST /api/invoices/verify-payment
// @desc    Verify invoice payment
// @access  Private/Company Users
router.post('/verify-payment', verifyInvoicePayment);

// @route   GET /api/invoices
// @desc    Get all invoices (role-based filtering)
// @access  Private/Admin, Company Users
router.get('/', getAllInvoices);

// @route   GET /api/invoices/order/:orderId
// @desc    Get invoice by order ID
// @access  Private/Admin, Company Users (with authorization)
router.get('/order/:orderId', getInvoiceByOrderId);

// @route   GET /api/invoices/:invoiceId
// @desc    Get invoice by ID
// @access  Private/Admin, Company Users (with authorization)
router.get('/:invoiceId', getInvoiceById);

// @route   DELETE /api/invoices/:invoiceId
// @desc    Delete invoice (admin and sub-admin - for cleanup)
// @access  Private/Admin, Sub-Admin
router.delete('/:invoiceId', authorize('admin', 'sub-admin'), deleteInvoice);

module.exports = router;
