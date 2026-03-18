const Branch = require('../models/Branch');
const User = require('../models/User');
const CompanyUser = require('../models/CompanyUser');

// @desc    Create a new branch (Company super-admin and company admin)
// @route   POST /api/branches/create
// @access  Private/Company Super-Admin, Company Admin
exports.createBranch = async (req, res) => {
    try {
        const { branchName, address, city, state, branchAdminId } = req.body;

        // Validate input
        if (!branchName || !address || !city || !state) {
            return res.status(400).json({
                success: false,
                message: 'Please provide branch name, address, city, and state'
            });
        }

        // Verify the user is a company super-admin or company admin
        if (!['super-admin', 'company-admin'].includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: 'Only company super-admin and company admin can create branches'
            });
        }

        // Get company details
        const company = await User.findById(req.user.companyId);
        if (!company) {
            return res.status(404).json({
                success: false,
                message: 'Company not found'
            });
        }

        // Verify branch admin if provided
        let branchAdmin = null;
        if (branchAdminId) {
            branchAdmin = await CompanyUser.findById(branchAdminId);
            if (!branchAdmin) {
                return res.status(404).json({
                    success: false,
                    message: 'Branch admin not found'
                });
            }

            // Verify branch admin belongs to the same company
            if (branchAdmin.company.toString() !== req.user.companyId.toString()) {
                return res.status(403).json({
                    success: false,
                    message: 'Branch admin must belong to the same company'
                });
            }

            // Verify branch admin has company-admin or super-admin role
            if (!['company-admin', 'super-admin'].includes(branchAdmin.role)) {
                return res.status(400).json({
                    success: false,
                    message: 'Branch admin must have company-admin or super-admin role'
                });
            }

            // Verify branch admin is active
            if (!branchAdmin.isActive) {
                return res.status(400).json({
                    success: false,
                    message: 'Branch admin is not active'
                });
            }
        }

        // Create branch data
        const branchData = {
            branchName,
            address,
            city,
            state,
            company: req.user.companyId,
            companyName: company.name,
            createdBy: req.user.id,
            isApproved: false,
            approvalStatus: 'pending'
        };

        // Add branch admin if provided
        if (branchAdminId) {
            branchData.branchAdmin = branchAdminId;
        }

        // Create branch
        const branch = await Branch.create(branchData);

        // Populate branch admin details if exists
        if (branchAdminId) {
            await branch.populate({
                path: 'branchAdmin',
                select: 'name email role isActive',
                model: 'CompanyUser'
            });
        }
        await branch.populate({
            path: 'createdBy',
            select: 'name email role',
            model: 'CompanyUser'
        });

        const responseData = {
            id: branch._id,
            branchName: branch.branchName,
            address: branch.address,
            city: branch.city,
            state: branch.state,
            companyName: branch.companyName,
            createdBy: {
                id: branch.createdBy._id,
                name: branch.createdBy.name,
                role: branch.createdBy.role
            },
            approvalStatus: branch.approvalStatus,
            createdAt: branch.createdAt
        };

        // Add branch admin to response if exists
        if (branch.branchAdmin) {
            responseData.branchAdmin = {
                id: branch.branchAdmin._id,
                name: branch.branchAdmin.name,
                email: branch.branchAdmin.email,
                role: branch.branchAdmin.role
            };
        }

        res.status(201).json({
            success: true,
            message: branchAdminId 
                ? 'Branch created successfully with branch admin. Waiting for main admin approval.'
                : 'Branch created successfully. Waiting for main admin approval. You can assign a branch admin later.',
            data: {
                branch: responseData
            }
        });
    } catch (error) {
        console.error('Create branch error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
};

// @desc    Get all branches for the logged-in company
// @route   GET /api/branches/my-branches
// @access  Private/Company Super-Admin, Admin
exports.getMyBranches = async (req, res) => {
    try {
        const { status, page = 1, limit = 10 } = req.query;

        // Build filter
        const filter = {};
        if (req.user.role !== 'admin') {
            filter.company = req.user.companyId;
        }

        
        if (status && ['pending', 'approved', 'rejected'].includes(status)) {
            filter.approvalStatus = status;
        }

        // Calculate pagination
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const skip = (pageNum - 1) * limitNum;

        // Get total count
        const totalBranches = await Branch.countDocuments(filter);

        // Get branches with pagination
        const branches = await Branch.find(filter)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limitNum)
            .populate('approvedBy', 'name email')
            .populate({
                path: 'branchAdmin',
                select: 'name email role isActive',
                model: 'CompanyUser'
            })
            .populate({
                path: 'createdBy',
                select: 'name email role',
                model: 'CompanyUser'
            });

        // Calculate pagination info
        const totalPages = Math.ceil(totalBranches / limitNum);

        res.status(200).json({
            success: true,
            count: branches.length,
            totalBranches,
            totalPages,
            currentPage: pageNum,
            data: branches,
            pagination: {
                page: pageNum,
                limit: limitNum,
                totalPages,
                totalRecords: totalBranches,
                hasNextPage: pageNum < totalPages,
                hasPrevPage: pageNum > 1
            }
        });
    } catch (error) {
        console.error('Get my branches error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
};

// @desc    Get branch statistics for the logged-in company
// @route   GET /api/branches/stats
// @access  Private/Company Super-Admin, Admin
exports.getBranchStats = async (req, res) => {
    try {
        const filter = req.user.role === 'admin' ? {} : { company: req.user.companyId };
        const stats = {
            total: await Branch.countDocuments(filter),
            pending: await Branch.countDocuments({ ...filter, approvalStatus: 'pending' }),
            approved: await Branch.countDocuments({ ...filter, approvalStatus: 'approved' }),
            rejected: await Branch.countDocuments({ ...filter, approvalStatus: 'rejected' }),
            active: await Branch.countDocuments({ ...filter, isActive: true, approvalStatus: 'approved' }),
            inactive: await Branch.countDocuments({ ...filter, isActive: false })
        };

        res.status(200).json({
            success: true,
            data: stats
        });
    } catch (error) {
        console.error('Get branch stats error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
};

// @desc    Get a single branch details
// @route   GET /api/branches/:branchId
// @access  Private/Company Super-Admin, Admin
exports.getBranchById = async (req, res) => {
    try {
        const { branchId } = req.params;

        const query = { _id: branchId };
        if (req.user.role !== 'admin') {
            query.company = req.user.companyId;
        }

        const branch = await Branch.findOne(query)
          .populate('approvedBy', 'name email')
          .populate({
              path: 'branchAdmin',
              select: 'name email role isActive branch',
              model: 'CompanyUser'
          })
          .populate({
              path: 'createdBy',
              select: 'name email role',
              model: 'CompanyUser'
          });

        if (!branch) {
            return res.status(404).json({
                success: false,
                message: 'Branch not found'
            });
        }

        res.status(200).json({
            success: true,
            data: branch
        });
    } catch (error) {
        console.error('Get branch error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
};

// @desc    Update branch details (only for pending branches)
// @route   PUT /api/branches/:branchId
// @access  Private/Company Super-Admin, Admin
exports.updateBranch = async (req, res) => {
    try {
        const { branchId } = req.params;
        const { branchName, address, city, state, branchAdminId } = req.body;

        // Find branch
        const query = { _id: branchId };
        if (req.user.role !== 'admin') {
            query.company = req.user.companyId;
        }
        const branch = await Branch.findOne(query);

        if (!branch) {
            return res.status(404).json({
                success: false,
                message: 'Branch not found'
            });
        }

        // Removed the restriction so that companies can edit their branches even after they are approved.
        // if (req.user.role !== 'admin' && branch.approvalStatus !== 'pending') {
        //     return res.status(400).json({
        //         success: false,
        //         message: 'Cannot update branch. Only pending branches can be updated.'
        //     });
        // }

        // Update fields
        if (branchName) branch.branchName = branchName;
        if (address) branch.address = address;
        if (city) branch.city = city;
        if (state) branch.state = state;
        
        // Update branch admin if provided
        if (branchAdminId) {
            // Verify branch admin exists and belongs to the same company
            const branchAdmin = await CompanyUser.findById(branchAdminId);
            if (!branchAdmin) {
                return res.status(404).json({
                    success: false,
                    message: 'Branch admin not found'
                });
            }

            if (branchAdmin.company.toString() !== branch.company.toString()) {
                return res.status(403).json({
                    success: false,
                    message: 'Branch admin must belong to the same company'
                });
            }

            if (!['company-admin', 'super-admin'].includes(branchAdmin.role)) {
                return res.status(400).json({
                    success: false,
                    message: 'Branch admin must have company-admin or super-admin role'
                });
            }

            branch.branchAdmin = branchAdminId;
            
            // Also update the branchAdmin's branch field in CompanyUser model
            branchAdmin.branch = branchId;
            await branchAdmin.save();
        }

        await branch.save();
        await branch.populate({
            path: 'branchAdmin',
            select: 'name email role isActive',
            model: 'CompanyUser'
        });
        await branch.populate({
            path: 'createdBy',
            select: 'name email role',
            model: 'CompanyUser'
        });

        res.status(200).json({
            success: true,
            message: 'Branch updated successfully',
            data: branch
        });
    } catch (error) {
        console.error('Update branch error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
};

// @desc    Assign or update branch admin
// @route   PUT /api/branches/:branchId/assign-admin
// @access  Private/Company Super-Admin
exports.assignBranchAdmin = async (req, res) => {
    try {
        const { branchId } = req.params;
        const { branchAdminId } = req.body;

        // Validate input
        if (!branchAdminId) {
            return res.status(400).json({
                success: false,
                message: 'Please provide branchAdminId'
            });
        }

        // Find branch
        const query = { _id: branchId };
        if (req.user.role !== 'admin') {
            query.company = req.user.companyId;
        }
        const branch = await Branch.findOne(query);

        if (!branch) {
            return res.status(404).json({
                success: false,
                message: 'Branch not found'
            });
        }

        // Verify branch admin exists and belongs to the same company
        const branchAdmin = await CompanyUser.findById(branchAdminId);
        if (!branchAdmin) {
            return res.status(404).json({
                success: false,
                message: 'Branch admin not found'
            });
        }

        // Verify branch admin belongs to the same company
        if (branchAdmin.company.toString() !== branch.company.toString()) {
            return res.status(403).json({
                success: false,
                message: 'Branch admin must belong to the same company'
            });
        }

        // Verify branch admin has company-admin role
        if (branchAdmin.role !== 'company-admin') {
            return res.status(400).json({
                success: false,
                message: 'User must have company-admin role to be assigned as branch admin'
            });
        }

        // Verify branch admin is active
        if (!branchAdmin.isActive) {
            return res.status(400).json({
                success: false,
                message: 'Branch admin is not active'
            });
        }

        // Update branch admin and also update the CompanyUser's branch field
        branch.branchAdmin = branchAdminId;
        await branch.save();

        // Update the branchAdmin's branch field in CompanyUser model
        branchAdmin.branch = branchId;
        await branchAdmin.save();

        // Populate details
        await branch.populate({
            path: 'branchAdmin',
            select: 'name email role isActive',
            model: 'CompanyUser'
        });
        await branch.populate({
            path: 'createdBy',
            select: 'name email role',
            model: 'CompanyUser'
        });
        await branch.populate('approvedBy', 'name email');

        res.status(200).json({
            success: true,
            message: 'Branch admin assigned successfully',
            data: branch
        });
    } catch (error) {
        console.error('Assign branch admin error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
};


// @desc    Delete branch (Admin only)
// @route   DELETE /api/branches/:branchId
// @access  Private/Admin
exports.deleteBranch = async (req, res) => {
    try {
        const { branchId } = req.params;

        // Restrict to admin only
        if (req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Only admins can delete branches'
            });
        }

        const branch = await Branch.findById(branchId);
        if (!branch) {
            return res.status(404).json({
                success: false,
                message: 'Branch not found'
            });
        }

        await branch.deleteOne();

        res.status(200).json({
            success: true,
            message: 'Branch deleted successfully'
        });
    } catch (error) {
        console.error('Delete branch error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
};

module.exports = exports;
