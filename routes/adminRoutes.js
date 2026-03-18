const express = require('express');
const router = express.Router();
const upload = require('../middleware/uploadMiddleware');
const { 
    createSubAdmin,
    createVendor,
    createCompany,
    getAllSubAdmins,
    toggleUserStatus,
    getAllBranches,
    approveBranch,
    rejectBranch,
    toggleBranchStatus,
    getBranchesStats,
    getDashboardStats,
    getAdminStoreStats
} = require('../controllers/adminController');
const {
    createCategory,
    getAllCategories,
    createSubCategory,
    getAllSubCategories,
    toggleCategoryStatus,
    toggleSubCategoryStatus,
    deleteCategory,
    deleteSubCategory
} = require('../controllers/categoryController');
const { protect, authorize } = require('../middleware/authMiddleware');

// Dashboard route (Admin and Sub-admin)
router.get('/dashboard', protect, authorize('admin', 'sub-admin'), getDashboardStats);

// Admin Direct Sales Dashboard
router.get('/my-store/dashboard', protect, authorize('admin', 'sub-admin'), getAdminStoreStats);

// Admin only routes
router.post('/create-sub-admin', protect, authorize('admin'), createSubAdmin);
router.get('/sub-admins', protect, authorize('admin'), getAllSubAdmins); 
router.put('/toggle-status/:userId', protect, authorize('admin'), toggleUserStatus); 

// Branch management routes (Admin only)
// Note: Specific paths must come before parameterized routes
router.get('/branches/stats', protect, authorize('admin'), getBranchesStats);
router.get('/branches', protect, authorize('admin'), getAllBranches);
router.put('/branches/approve/:branchId', protect, authorize('admin'), approveBranch);
router.put('/branches/reject/:branchId', protect, authorize('admin'), rejectBranch);
router.put('/branches/toggle-status/:branchId', protect, authorize('admin'), toggleBranchStatus);

// Admin and Sub-admin routes
router.post('/create-vendor', protect, authorize('admin', 'sub-admin'), upload.single('seCertificate'), createVendor);
router.post('/create-company', protect, authorize('admin', 'sub-admin'), upload.single('seCertificate'), createCompany);

// Category management routes
router.post('/categories', protect, authorize('admin'), createCategory);
router.get('/categories', getAllCategories); // Public access
router.put('/categories/:categoryId/toggle-status', protect, authorize('admin'), toggleCategoryStatus);
router.delete('/categories/:categoryId', protect, authorize('admin', 'sub-admin'), deleteCategory);

// Sub-category management routes
router.post('/sub-categories', protect, authorize('admin'), createSubCategory);
router.get('/sub-categories', getAllSubCategories); // Public access
router.put('/sub-categories/:subCategoryId/toggle-status', protect, authorize('admin'), toggleSubCategoryStatus);
router.delete('/sub-categories/:subCategoryId', protect, authorize('admin', 'sub-admin'), deleteSubCategory);

module.exports = router;
