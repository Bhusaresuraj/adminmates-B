const express = require('express');
const router = express.Router();
const { uploadImages } = require('../middleware/imageUploadMiddleware');
const {
    createProduct,
    updateProduct,
    deleteProduct,
    getAllProducts,
    getMyProducts,
    getProductById,
    toggleProductStatus,
    approveProduct,
    rejectProduct,
    getProductStats
} = require('../controllers/productController');
const { protect, authorize, optionalAuth } = require('../middleware/authMiddleware');

// Public/Authenticated routes (works for both)
router.get('/', optionalAuth, getAllProducts);

// Get My Products route (specifically for logged-in user's own products)
router.get('/my-products', protect, authorize('vendor', 'admin', 'sub-admin', 'super-admin'), getMyProducts);

// Admin Direct Sales specific route for products
router.get('/admin/my-products', protect, authorize('admin', 'sub-admin'), getMyProducts);

// Statistics routes - accessible by vendors (own stats) and admins (all stats)
router.get('/stats', protect, authorize('vendor', 'admin', 'sub-admin'), getProductStats);

// Vendor routes
router.post('/', protect, authorize('vendor'), uploadImages.array('images', 10), createProduct);
router.put('/:productId', protect, authorize('vendor'), uploadImages.array('images', 10), updateProduct);
router.delete('/:productId', protect, authorize('vendor'), deleteProduct);
router.put('/:productId/toggle-status', protect, authorize('vendor'), toggleProductStatus);

// Admin routes
router.put('/:productId/approve', protect, authorize('admin', 'sub-admin'), approveProduct);
router.put('/:productId/reject', protect, authorize('admin', 'sub-admin'), rejectProduct);

// Get single product (must be placed at the bottom to prevent catching other valid GET paths)
router.get('/:productId', optionalAuth, getProductById);

module.exports = router;
