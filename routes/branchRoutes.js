const express = require('express');
const router = express.Router();
const { 
    createBranch,
    getMyBranches,
    getBranchStats,
    getBranchById,
    updateBranch,
    assignBranchAdmin
} = require('../controllers/branchController');
const { protect, authorize } = require('../middleware/authMiddleware');

// All routes are protected and only for company super-admin and company admin
router.post('/create', protect, authorize('super-admin', 'company-admin'), createBranch);
router.get('/my-branches', protect, authorize('super-admin', 'company-admin'), getMyBranches);
router.get('/stats', protect, authorize('super-admin', 'company-admin'), getBranchStats);
router.get('/:branchId', protect, authorize('super-admin', 'company-admin'), getBranchById);
router.put('/:branchId', protect, authorize('super-admin', 'company-admin'), updateBranch);
router.put('/:branchId/assign-admin', protect, authorize('super-admin'), assignBranchAdmin);

module.exports = router;
