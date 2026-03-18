const CompanyUser = require('../models/CompanyUser');
const User = require('../models/User');
const Branch = require('../models/Branch');
const jwt = require('jsonwebtoken');
const { sendCredentialsEmail } = require('../utils/emailService');

// Helper function to generate random password
const generateRandomPassword = (length = 12) => {
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < length; i++) {
        password += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    return password;
};

// Generate JWT Token for company users
const generateToken = (id, role, companyId) => {
    return jwt.sign({ id, role, companyId, userType: 'company-user' }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRE || '30d'
    });
};

// @desc    Company user login
// @route   POST /api/company/login
// @access  Public
exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Validate email & password
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Please provide email and password'
            });
        }

        // Check for company user (include password field)
        const companyUser = await CompanyUser.findOne({ email }).select('+password').populate('company', 'name email isApproved approvalStatus');

        if (!companyUser) {
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
        }

        // Check if company user is active
        if (!companyUser.isActive) {
            return res.status(401).json({
                success: false,
                message: 'Your account has been deactivated. Please contact your company administrator.'
            });
        }

        // Check if company is approved
        if (!companyUser.company.isApproved || companyUser.company.approvalStatus !== 'approved') {
            return res.status(401).json({
                success: false,
                message: 'Your company account is not approved yet. Please wait for admin approval.'
            });
        }

        // Check if password matches
        const isPasswordMatch = await companyUser.comparePassword(password);
        if (!isPasswordMatch) {
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
        }

        // Generate token
        const token = generateToken(companyUser._id, companyUser.role, companyUser.company._id);

        res.status(200).json({
            success: true,
            message: 'Login successful',
            data: {
                user: {
                    id: companyUser._id,
                    name: companyUser.name,
                    email: companyUser.email,
                    role: companyUser.role,
                    company: {
                        id: companyUser.company._id,
                        name: companyUser.company.name
                    }
                },
                token
            }
        });
    } catch (error) {
        console.error('Company user login error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
};

// @desc    Get current logged in company user
// @route   GET /api/company/me
// @access  Private (Company Users)
exports.getMe = async (req, res) => {
    try {
        const companyUser = await CompanyUser.findById(req.user.id)
            .populate('company', 'name email companyLocation gstNumber')
            .populate('branch', 'branchName address city state approvalStatus');

        if (!companyUser) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        const userData = {
            id: companyUser._id,
            name: companyUser.name,
            email: companyUser.email,
            role: companyUser.role,
            isActive: companyUser.isActive,
            company: companyUser.company,
            createdAt: companyUser.createdAt
        };

        // Add branch if exists
        if (companyUser.branch) {
            userData.branch = companyUser.branch;
        }

        res.status(200).json({
            success: true,
            data: {
                user: userData
            }
        });
    } catch (error) {
        console.error('Get company user error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
};

// @desc    Create company admin (Company Super-Admin only)
// @route   POST /api/company/create-admin
// @access  Private/Company Super-Admin
exports.createAdmin = async (req, res) => {
    try {
        const { name, email, branchId } = req.body;

        // Validate input
        if (!name || !email) {
            return res.status(400).json({
                success: false,
                message: 'Please provide name and email'
            });
        }

        // Validate and check branch if provided
        let branch = null;
        if (branchId) {
            branch = await Branch.findById(branchId);
            
            if (!branch) {
                return res.status(404).json({
                    success: false,
                    message: 'Branch not found'
                });
            }

            // Verify branch belongs to the same company
            if (branch.company.toString() !== req.user.companyId.toString()) {
                return res.status(403).json({
                    success: false,
                    message: 'Branch does not belong to your company'
                });
            }

            // Verify branch is approved
            if (branch.approvalStatus !== 'approved' || !branch.isApproved) {
                return res.status(400).json({
                    success: false,
                    message: 'Branch must be approved before assigning users'
                });
            }
        }

        // Check if user already exists (in CompanyUser)
        const userExists = await CompanyUser.findOne({ email });
        if (userExists) {
            return res.status(400).json({
                success: false,
                message: 'User already exists with this email in your company'
            });
        }

        // Generate random password
        const password = generateRandomPassword();

        // Create company admin user data
        const adminData = {
            name,
            email,
            password,
            role: 'company-admin',
            company: req.user.companyId,
            createdBy: req.user.id,
            isActive: true
        };

        // Add branch if provided
        if (branchId) {
            adminData.branch = branchId;
        }

        // Create company admin user
        const companyAdmin = await CompanyUser.create(adminData);

        // Update branch with this admin if branch was provided
        if (branchId) {
            await Branch.findByIdAndUpdate(branchId, {
                branchAdmin: companyAdmin._id
            });
        }

        // Populate branch details if exists
        if (branchId) {
            await companyAdmin.populate('branch', 'branchName address city state');
        }

        // Send email with credentials
        try {
            await sendCredentialsEmail(email, name, password, 'company-admin');
        } catch (emailError) {
            console.error('Error sending email:', emailError);
        }

        const responseData = {
            id: companyAdmin._id,
            name: companyAdmin.name,
            email: companyAdmin.email,
            role: companyAdmin.role,
            company: companyAdmin.company
        };

        // Add branch info if present
        if (companyAdmin.branch) {
            responseData.branch = {
                id: companyAdmin.branch._id,
                branchName: companyAdmin.branch.branchName,
                city: companyAdmin.branch.city,
                state: companyAdmin.branch.state
            };
        }

        res.status(201).json({
            success: true,
            message: branchId 
                ? 'Company admin created successfully and assigned to branch. Login credentials have been sent to their email.'
                : 'Company admin created successfully. Login credentials have been sent to their email.',
            data: {
                user: responseData
            }
        });
    } catch (error) {
        console.error('Create company admin error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
};

// @desc    Create user (Company Super-Admin and Company Admin)
// @route   POST /api/company/create-user
// @access  Private/Company Super-Admin, Company Admin
exports.createUser = async (req, res) => {
    try {
        const { name, email, branchId } = req.body;

        // Validate input
        if (!name || !email) {
            return res.status(400).json({
                success: false,
                message: 'Please provide name and email'
            });
        }

        // Determine branch assignment based on role
        let branch = null;
        let finalBranchId = null;

        if (req.user.role === 'company-admin') {
            // For company admin: automatically assign to their branch
            const companyAdmin = await CompanyUser.findById(req.user.id).populate('branch');
            
            if (!companyAdmin || !companyAdmin.branch) {
                return res.status(403).json({
                    success: false,
                    message: 'You are not assigned to any branch. Please contact super-admin.'
                });
            }

            branch = companyAdmin.branch;

            // Verify branch is approved
            if (branch.approvalStatus !== 'approved' || !branch.isApproved) {
                return res.status(403).json({
                    success: false,
                    message: 'Your branch is not approved yet. Cannot create users.'
                });
            }

            finalBranchId = branch._id;

        } else if (req.user.role === 'super-admin') {
            // For super-admin: branchId is optional but if provided, validate it
            if (branchId) {
                branch = await Branch.findById(branchId);
                
                if (!branch) {
                    return res.status(404).json({
                        success: false,
                        message: 'Branch not found'
                    });
                }

                // Verify branch belongs to the same company
                if (branch.company.toString() !== req.user.companyId.toString()) {
                    return res.status(403).json({
                        success: false,
                        message: 'Branch does not belong to your company'
                    });
                }

                // Verify branch is approved
                if (branch.approvalStatus !== 'approved' || !branch.isApproved) {
                    return res.status(400).json({
                        success: false,
                        message: 'Branch must be approved before adding users'
                    });
                }

                finalBranchId = branchId;
            }
            // If super-admin doesn't provide branchId, user will be created without branch assignment
        }

        // Check if user already exists (in CompanyUser)
        const userExists = await CompanyUser.findOne({ email });
        if (userExists) {
            return res.status(400).json({
                success: false,
                message: 'User already exists with this email in your company'
            });
        }

        // Generate random password
        const password = generateRandomPassword();

        // Create user data
        const userData = {
            name,
            email,
            password,
            role: 'user',
            company: req.user.companyId,
            createdBy: req.user.id,
            isActive: true
        };

        // Add branch if determined
        if (finalBranchId) {
            userData.branch = finalBranchId;
        }

        // Create user
        const user = await CompanyUser.create(userData);

        // Populate branch details if exists
        if (finalBranchId) {
            await user.populate('branch', 'branchName address city state');
        }

        // Send email with credentials
        try {
            await sendCredentialsEmail(email, name, password, 'company-user');
        } catch (emailError) {
            console.error('Error sending email:', emailError);
        }

        const responseData = {
            id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            company: user.company
        };

        // Add branch info if present
        if (user.branch) {
            responseData.branch = {
                id: user.branch._id,
                branchName: user.branch.branchName,
                address: user.branch.address,
                city: user.branch.city,
                state: user.branch.state
            };
        }

        res.status(201).json({
            success: true,
            message: finalBranchId 
                ? 'User created successfully and assigned to branch. Login credentials have been sent to their email.'
                : 'User created successfully. Login credentials have been sent to their email.',
            data: {
                user: responseData
            }
        });
    } catch (error) {
        console.error('Create user error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
};

// @desc    Get all company users with filters
// @route   GET /api/company/users?role=company-admin&page=1&limit=10&search=john&branchId=123
// @access  Private/Company Super-Admin, Company Admin
exports.getAllCompanyUsers = async (req, res) => {
    try {
        const { role, page = 1, limit = 10, search, branchId } = req.query;

        // Build filter query
        const filter = { company: req.user.companyId };

        // Add role filter if provided
        if (role && ['super-admin', 'company-admin', 'user'].includes(role)) {
            filter.role = role;
        }

        // Add branch filter if provided
        if (branchId) {
            filter.branch = branchId;
        }

        // Add search filter (name or email)
        if (search) {
            filter.$or = [
                { name: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } }
            ];
        }

        // Calculate pagination
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const skip = (pageNum - 1) * limitNum;

        // Get total count
        const totalUsers = await CompanyUser.countDocuments(filter);

        // Get users with pagination
        const users = await CompanyUser.find(filter)
            .select('-password')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limitNum)
            .populate('createdBy', 'name email role')
            .populate('company', 'name email')
            .populate('branch', 'branchName address city state approvalStatus');

        // Calculate pagination info
        const totalPages = Math.ceil(totalUsers / limitNum);

        res.status(200).json({
            success: true,
            count: users.length,
            totalUsers,
            totalPages,
            currentPage: pageNum,
            data: users,
            pagination: {
                page: pageNum,
                limit: limitNum,
                totalPages,
                totalRecords: totalUsers,
                hasNextPage: pageNum < totalPages,
                hasPrevPage: pageNum > 1
            }
        });
    } catch (error) {
        console.error('Get company users error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
};

// @desc    Get company user by ID
// @route   GET /api/company/users/:userId
// @access  Private/Company Super-Admin, Company Admin
exports.getCompanyUserById = async (req, res) => {
    try {
        const { userId } = req.params;

        const user = await CompanyUser.findOne({ _id: userId, company: req.user.companyId })
            .select('-password')
            .populate('createdBy', 'name email role')
            .populate('company', 'name email companyLocation')
            .populate('branch', 'branchName address city state approvalStatus');

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        res.status(200).json({
            success: true,
            data: user
        });
    } catch (error) {
        console.error('Get company user error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
};

// @desc    Toggle company user active status
// @route   PUT /api/company/users/:userId/toggle-status
// @access  Private/Company Super-Admin, Company Admin
exports.toggleUserStatus = async (req, res) => {
    try {
        const { userId } = req.params;

        const user = await CompanyUser.findOne({ _id: userId, company: req.user.companyId });

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Prevent super-admin from being deactivated by themselves
        if (user.role === 'super-admin' && user._id.toString() === req.user.id) {
            return res.status(400).json({
                success: false,
                message: 'You cannot deactivate your own super-admin account'
            });
        }

        // Prevent company admin from deactivating super-admin
        if (req.user.role === 'company-admin' && user.role === 'super-admin') {
            return res.status(403).json({
                success: false,
                message: 'You do not have permission to deactivate a super-admin'
            });
        }

        // Toggle status
        user.isActive = !user.isActive;
        await user.save();

        const action = user.isActive ? 'activated' : 'deactivated';

        res.status(200).json({
            success: true,
            message: `User ${action} successfully`,
            data: {
                user: {
                    id: user._id,
                    name: user.name,
                    email: user.email,
                    role: user.role,
                    isActive: user.isActive
                }
            }
        });
    } catch (error) {
        console.error('Toggle user status error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
};

// @desc    Delete company user
// @route   DELETE /api/company/users/:userId
// @access  Private/Company Super-Admin
exports.deleteUser = async (req, res) => {
    try {
        const { userId } = req.params;

        const user = await CompanyUser.findOne({ _id: userId, company: req.user.companyId });

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Prevent super-admin from deleting themselves
        if (user.role === 'super-admin' && user._id.toString() === req.user.id) {
            return res.status(400).json({
                success: false,
                message: 'You cannot delete your own super-admin account'
            });
        }

        // Prevent deleting super-admin
        if (user.role === 'super-admin') {
            return res.status(400).json({
                success: false,
                message: 'Cannot delete super-admin account'
            });
        }

        await user.deleteOne();

        res.status(200).json({
            success: true,
            message: 'User deleted successfully'
        });
    } catch (error) {
        console.error('Delete user error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
};

// @desc    Get company user statistics
// @route   GET /api/company/stats
// @access  Private/Company Super-Admin, Company Admin
exports.getStats = async (req, res) => {
    try {
        const companyId = req.user.companyId;

        const stats = {
            totalUsers: await CompanyUser.countDocuments({ company: companyId }),
            activeUsers: await CompanyUser.countDocuments({ company: companyId, isActive: true }),
            inactiveUsers: await CompanyUser.countDocuments({ company: companyId, isActive: false }),
            byRole: {
                superAdmins: await CompanyUser.countDocuments({ company: companyId, role: 'super-admin' }),
                companyAdmins: await CompanyUser.countDocuments({ company: companyId, role: 'company-admin' }),
                users: await CompanyUser.countDocuments({ company: companyId, role: 'user' })
            }
        };

        res.status(200).json({
            success: true,
            data: stats
        });
    } catch (error) {
        console.error('Get stats error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
};

// @desc    Set monthly limit for a company user
// @route   PUT /api/company/users/:userId/set-limit
// @access  Private/Company Super-Admin (can set for admin and users), Company Admin (can set for users only)
exports.setMonthlyLimit = async (req, res) => {
    try {
        const { userId } = req.params;
        const { monthlyLimit } = req.body;

        // Validate monthly limit
        if (monthlyLimit === undefined || monthlyLimit < 0) {
            return res.status(400).json({
                success: false,
                message: 'Please provide a valid monthly limit (0 or greater)'
            });
        }

        // Find the user
        const user = await CompanyUser.findOne({ _id: userId, company: req.user.companyId });

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Authorization checks
        if (req.user.role === 'company-admin') {
            // Company admin can only set limits for regular users
            if (user.role !== 'user') {
                return res.status(403).json({
                    success: false,
                    message: 'Company admins can only set limits for regular users'
                });
            }
        } else if (req.user.role === 'super-admin') {
            // Super admin can set limits for company-admin and users, but not for other super-admins
            if (user.role === 'super-admin') {
                return res.status(403).json({
                    success: false,
                    message: 'Cannot set limits for super-admin users'
                });
            }
        } else {
            return res.status(403).json({
                success: false,
                message: 'You do not have permission to set monthly limits'
            });
        }

        // Set the monthly limit
        user.monthlyLimit = monthlyLimit;
        await user.save();

        res.status(200).json({
            success: true,
            message: 'Monthly limit set successfully',
            data: {
                user: {
                    id: user._id,
                    name: user.name,
                    email: user.email,
                    role: user.role,
                    monthlyLimit: user.monthlyLimit,
                    monthlySpent: user.monthlySpent
                }
            }
        });
    } catch (error) {
        console.error('Set monthly limit error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
};

// @desc    Get dashboard statistics
// @route   GET /api/company/dashboard
// @access  Private/Company Super-Admin, Company Admin
exports.getDashboard = async (req, res) => {
    try {
        const Order = require('../models/Order');
        
        if (req.user.role === 'super-admin') {
            // Super admin sees company-wide statistics
            const [totalBranches, totalEmployees, totalOrders] = await Promise.all([
                Branch.countDocuments({ 
                    company: req.user.companyId,
                    isApproved: true,
                    approvalStatus: 'approved'
                }),
                CompanyUser.countDocuments({ company: req.user.companyId }),
                Order.countDocuments({ company: req.user.companyId })
            ]);

            return res.status(200).json({
                success: true,
                data: {
                    role: 'super-admin',
                    totalBranches,
                    totalEmployees,
                    totalOrders
                }
            });
        } else if (req.user.role === 'company-admin') {
            // Company admin sees branch-specific statistics
            // Find the branch where this user is the branch admin
            const branch = await Branch.findOne({ 
                branchAdmin: req.user.id,
                company: req.user.companyId,
                approvalStatus: 'approved',
                isApproved: true
            });

            if (!branch) {
                return res.status(403).json({
                    success: false,
                    message: 'You are not assigned as admin to any approved branch'
                });
            }

            const [totalEmployees, totalOrders] = await Promise.all([
                CompanyUser.countDocuments({ 
                    company: req.user.companyId,
                    branch: branch._id
                }),
                Order.countDocuments({ 
                    company: req.user.companyId,
                    branch: branch._id
                })
            ]);

            return res.status(200).json({
                success: true,
                data: {
                    role: 'company-admin',
                    branch: {
                        id: branch._id,
                        name: branch.branchName,
                        address: branch.address,
                        city: branch.city,
                        state: branch.state
                    },
                    totalEmployees,
                    totalOrders
                }
            });
        } else {
            return res.status(403).json({
                success: false,
                message: 'Access denied. Only super-admin and company-admin can access dashboard.'
            });
        }
    } catch (error) {
        console.error('Get dashboard error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
};

// @desc    Get user's monthly limit and spending details
// @route   GET /api/company/my-limit
// @access  Private/Company Users
exports.getMyLimit = async (req, res) => {
    try {
        const user = await CompanyUser.findById(req.user.id).select('name email role monthlyLimit monthlySpent lastResetDate');

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Check and reset if needed
        await user.checkAndResetMonthlySpending();

        const response = {
            name: user.name,
            email: user.email,
            role: user.role,
            monthlyLimit: user.monthlyLimit,
            monthlySpent: user.monthlySpent,
            remainingLimit: user.role === 'super-admin' ? null : (user.monthlyLimit - user.monthlySpent),
            lastResetDate: user.lastResetDate
        };

        if (user.role === 'super-admin') {
            response.hasUnlimitedAccess = true;
        }

        res.status(200).json({
            success: true,
            data: response
        });
    } catch (error) {
        console.error('Get my limit error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
};

// @desc    Get monthly limit and spending for a specific user
// @route   GET /api/company/users/:userId/limit
// @access  Private/Company Super-Admin, Company Admin
exports.getUserLimit = async (req, res) => {
    try {
        const { userId } = req.params;

        const user = await CompanyUser.findOne({ 
            _id: userId, 
            company: req.user.companyId 
        }).select('name email role monthlyLimit monthlySpent lastResetDate');

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Authorization check
        if (req.user.role === 'company-admin' && user.role !== 'user') {
            return res.status(403).json({
                success: false,
                message: 'Company admins can only view limits for regular users'
            });
        }

        // Check and reset if needed
        await user.checkAndResetMonthlySpending();

        const response = {
            name: user.name,
            email: user.email,
            role: user.role,
            monthlyLimit: user.monthlyLimit,
            monthlySpent: user.monthlySpent,
            remainingLimit: user.role === 'super-admin' ? null : (user.monthlyLimit - user.monthlySpent),
            lastResetDate: user.lastResetDate
        };

        if (user.role === 'super-admin') {
            response.hasUnlimitedAccess = true;
        }

        res.status(200).json({
            success: true,
            data: response
        });
    } catch (error) {
        console.error('Get user limit error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
};

// @desc    Reassign branch for company admin or user
// @route   PUT /api/company/users/:userId/reassign-branch
// @access  Private/Company Super-Admin only
exports.reassignBranch = async (req, res) => {
    try {
        const { userId } = req.params;
        const { branchId } = req.body;

        // Validate branchId
        if (!branchId) {
            return res.status(400).json({
                success: false,
                message: 'Please provide branchId'
            });
        }

        // Find the user
        const user = await CompanyUser.findOne({ 
            _id: userId, 
            company: req.user.companyId 
        });

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found in your company'
            });
        }

        // Cannot reassign super-admin
        if (user.role === 'super-admin') {
            return res.status(403).json({
                success: false,
                message: 'Cannot reassign branch for super-admin'
            });
        }

        // Validate branch
        const branch = await Branch.findById(branchId);
        
        if (!branch) {
            return res.status(404).json({
                success: false,
                message: 'Branch not found'
            });
        }

        // Verify branch belongs to the same company
        if (branch.company.toString() !== req.user.companyId.toString()) {
            return res.status(403).json({
                success: false,
                message: 'Branch does not belong to your company'
            });
        }

        // Verify branch is approved
        if (branch.approvalStatus !== 'approved' || !branch.isApproved) {
            return res.status(400).json({
                success: false,
                message: 'Branch must be approved before assigning users'
            });
        }

        // Update user's branch
        user.branch = branchId;
        await user.save();

        // If user is company-admin, also update the branch's branchAdmin field
        if (user.role === 'company-admin') {
            await Branch.findByIdAndUpdate(branchId, {
                branchAdmin: user._id
            });
        }

        // Populate branch details
        await user.populate('branch', 'branchName address city state');

        res.status(200).json({
            success: true,
            message: 'Branch reassigned successfully',
            data: {
                user: {
                    id: user._id,
                    name: user.name,
                    email: user.email,
                    role: user.role,
                    branch: {
                        id: user.branch._id,
                        branchName: user.branch.branchName,
                        city: user.branch.city,
                        state: user.branch.state
                    }
                }
            }
        });
    } catch (error) {
        console.error('Reassign branch error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
};

module.exports = exports;
