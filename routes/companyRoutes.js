const express = require('express');
const router = express.Router();
const {
    login,
    getMe,
    createAdmin,
    createUser,
    getAllCompanyUsers,
    getCompanyUserById,
    toggleUserStatus,
    deleteUser,
    getStats,
    setMonthlyLimit,
    getMyLimit,
    getUserLimit,
    getDashboard,
    reassignBranch
} = require('../controllers/companyController');
const { protect, authorize } = require('../middleware/authMiddleware');

// Public routes - DEPRECATED: Use /api/auth/login instead
router.post('/login', login);

// Protected routes - All company users
router.get('/me', protect, getMe);
router.get('/dashboard', protect, authorize('super-admin', 'company-admin'), getDashboard);
router.get('/stats', protect, authorize('super-admin', 'company-admin'), getStats);

// Monthly limit routes
router.get('/my-limit', protect, getMyLimit);
router.get('/users/:userId/limit', protect, authorize('super-admin', 'company-admin'), getUserLimit);
router.put('/users/:userId/set-limit', protect, authorize('super-admin', 'company-admin'), setMonthlyLimit);

// Company user management
router.get('/users', protect, authorize('super-admin', 'company-admin'), getAllCompanyUsers);
router.get('/users/:userId', protect, authorize('super-admin', 'company-admin'), getCompanyUserById);

// Super-admin only routes
router.post('/create-admin', protect, authorize('super-admin'), createAdmin);
router.delete('/users/:userId', protect, authorize('super-admin'), deleteUser);
router.put('/users/:userId/reassign-branch', protect, authorize('super-admin'), reassignBranch);

// Super-admin and company admin routes
router.post('/create-user', protect, authorize('super-admin', 'company-admin'), createUser);
router.put('/users/:userId/toggle-status', protect, authorize('super-admin', 'company-admin'), toggleUserStatus);

module.exports = router;
