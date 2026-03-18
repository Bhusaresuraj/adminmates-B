const express = require('express');
const router = express.Router();
const { uploadImages } = require('../middleware/imageUploadMiddleware');
const {
    createProduct,
    updateProduct,
    deleteProduct,
    getAllProducts,
    getProductById,
    toggleProductStatus,
    approveProduct,
    rejectProduct,
    getProductStats
} = require('../controllers/productController');
const { protect, authorize, optionalAuth } = require('../middleware/authMiddleware');

// Public/Authenticated routes (works for both)
router.get('/', optionalAuth, getAllProducts);
router.get('/:productId', optionalAuth, getProductById);

// Vendor routes
router.post('/', protect, authorize('vendor'), uploadImages.array('images', 10), createProduct);
router.put('/:productId', protect, authorize('vendor'), uploadImages.array('images', 10), updateProduct);
router.delete('/:productId', protect, authorize('vendor'), deleteProduct);
router.put('/:productId/toggle-status', protect, authorize('vendor'), toggleProductStatus);

// Statistics routes - accessible by vendors (own stats) and admins (all stats)
router.get('/admin/stats', protect, authorize('vendor', 'admin', 'sub-admin'), getProductStats);

// Admin routes
router.put('/:productId/approve', protect, authorize('admin', 'sub-admin'), approveProduct);
router.put('/:productId/reject', protect, authorize('admin', 'sub-admin'), rejectProduct);

module.exports = router;
