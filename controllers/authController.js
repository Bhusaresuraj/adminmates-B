const User = require('../models/User');
const CompanyUser = require('../models/CompanyUser');
const { sendOTPEmail } = require('../utils/emailService');
const { uploadPDFToCloudinary } = require('../utils/fileUpload');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

// Generate JWT Token
const generateToken = (id, role, userType = null, companyId = null) => {
    const payload = { id, role };
    
    if (userType === 'company-user') {
        payload.userType = 'company-user';
        payload.companyId = companyId;
    }
    
    return jwt.sign(payload, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRE || '30d'
    });
};

// @desc    Register user
// @route   POST /api/auth/signup
// @access  Public

exports.signup = async (req, res) => {
    try {
        const { name, email, password, role, gstNumber, aadharNumber, panCard, companyLocation, vendorLocation } = req.body;

        // Validate basic input
        if (!name || !email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Please provide name, email and password'
            });
        }

        // Role-specific validation
        const userRole = role || 'company';

        if (userRole === 'company') {
            if (!companyLocation) {
                return res.status(400).json({
                    success: false,
                    message: 'Company location is required for company registration'
                });
            }
        }

        if (userRole === 'vendor') {
            if (!vendorLocation) {
                return res.status(400).json({
                    success: false,
                    message: 'Vendor location is required for vendor registration'
                });
            }
        }

        // Validate S&E Certificate for vendors and companies
        if ((userRole === 'vendor' || userRole === 'company') && !req.file) {
            return res.status(400).json({
                success: false,
                message: 'S&E Certificate PDF is required for vendor and company registration'
            });
        }

        // Validate PAN card format if provided
        // if (panCard) {
        //     const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
        //     if (!panRegex.test(panCard.toUpperCase())) {
        //         return res.status(400).json({
        //             success: false,
        //             message: 'Please provide a valid PAN card (format: ABCDE1234F)'
        //         });
        //     }
        // }

        // Check if user already exists
        const userExists = await User.findOne({ email });
        if (userExists) {
            return res.status(400).json({
                success: false,
                message: 'User already exists with this email'
            });
        }

        // Check if PAN card already exists
        if (panCard && (userRole === 'vendor' || userRole === 'company')) {
            const panExists = await User.findOne({ panCard: panCard.toUpperCase() });
            if (panExists) {
                return res.status(400).json({
                    success: false,
                    message: 'This PAN card is already registered'
                });
            }
        }

        // Check if GST number already exists
        if (gstNumber && (userRole === 'vendor' || userRole === 'company')) {
            const gstExists = await User.findOne({ gstNumber: gstNumber.toUpperCase() });
            if (gstExists) {
                return res.status(400).json({
                    success: false,
                    message: 'This GST number is already registered'
                });
            }
        }

        // Upload S&E Certificate to Cloudinary for vendors and companies
        let seCertificateData = null;
        if ((userRole === 'vendor' || userRole === 'company') && req.file) {
            try {
                const fileName = `${userRole}_${email.split('@')[0]}_certificate`;
                seCertificateData = await uploadPDFToCloudinary(req.file.buffer, fileName);
            } catch (uploadError) {
                console.error('Certificate upload error:', uploadError);
                return res.status(500).json({
                    success: false,
                    message: 'Error uploading S&E Certificate. Please try again.'
                });
            }
        }

        
        const userData = {
            name,
            email,
            password: password, 
            role: userRole
        };

        // Add role-specific fields
        if (userRole === 'vendor' || userRole === 'company') {
            if (gstNumber) userData.gstNumber = gstNumber.toUpperCase();
            if (panCard) userData.panCard = panCard.toUpperCase();
            userData.seCertificate = seCertificateData;
        }

        if (userRole === 'company') {
            userData.companyLocation = companyLocation;
        }

        if (userRole === 'vendor') {
            userData.vendorLocation = vendorLocation;
        }

        // Create user (pre-save hook will hash the password)
        const user = await User.create(userData);

        // For companies, create a super-admin CompanyUser
        if (userRole === 'company') {
            try {
                await CompanyUser.create({
                    name: name,
                    email: email,
                    password: password,
                    role: 'super-admin',
                    company: user._id,
                    isActive: false // Will be activated when company is approved
                });
            } catch (companyUserError) {
                console.error('Error creating company super-admin:', companyUserError);
                // Rollback: delete the company user if CompanyUser creation fails
                await User.findByIdAndDelete(user._id);
                return res.status(500).json({
                    success: false,
                    message: 'Error creating company super-admin user'
                });
            }

            return res.status(201).json({
                success: true,
                message: 'Company registered successfully. Your account is pending approval from admin. Once approved, you can login with the same credentials.',
                data: {
                    user: {
                        id: user._id,
                        name: user.name,
                        email: user.email,
                        role: user.role,
                        approvalStatus: user.approvalStatus
                    }
                }
            });
        }

        // For vendors (pending approval), don't generate token
        if (userRole === 'vendor') {
            return res.status(201).json({
                success: true,
                message: `${userRole.charAt(0).toUpperCase() + userRole.slice(1)} registered successfully. Your account is pending approval from admin.`,
                data: {
                    user: {
                        id: user._id,
                        name: user.name,
                        email: user.email,
                        role: user.role,
                        approvalStatus: user.approvalStatus
                    }
                }
            });
        }

        // For admin role, generate token immediately
        const token = generateToken(user._id, user.role);

        res.status(201).json({
            success: true,
            message: 'Admin registered successfully',
            data: {
                user: {
                    id: user._id,
                    name: user.name,
                    email: user.email,
                    role: user.role
                },
                token
            }
        });
    } catch (error) {
        console.error('Signup error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
};

// @desc    Login user
// @route   POST /api/auth/login
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

        // Check for user (include password field)
        let user = await User.findOne({ email }).select('+password');
        
        // If not found in User, check CompanyUser
        if (!user) {
            const companyUser = await CompanyUser.findOne({ email }).select('+password').populate('company', 'name email isApproved approvalStatus companyLocation gstNumber');
            
            if (companyUser) {
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

                // Generate token for company user
                const token = generateToken(companyUser._id, companyUser.role, 'company-user', companyUser.company._id);

                return res.status(200).json({
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
                                name: companyUser.company.name,
                                companyLocation: companyUser.company.companyLocation,
                                gstNumber: companyUser.company.gstNumber
                            }
                        },
                        token
                    }
                });
            }

            // If not found in both User and CompanyUser
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
        }

        // Check if user is active
        if (!user.isActive) {
            return res.status(401).json({
                success: false,
                message: 'Your account has been deactivated. Please contact support.'
            });
        }

        // Check if password matches
        const isPasswordMatch = await user.comparePassword(password);
        if (!isPasswordMatch) {
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
        }

        // Special handling for company users - redirect to CompanyUser
        if (user.role === 'company') {
            // Check approval status first
            if (user.approvalStatus === 'pending') {
                return res.status(403).json({
                    success: false,
                    message: 'Your account is pending approval from admin. You will be able to login once your account is approved.'
                });
            }
            
            if (user.approvalStatus === 'rejected') {
                return res.status(403).json({
                    success: false,
                    message: `Your account has been rejected. Reason: ${user.rejectionReason || 'Not specified'}. Please contact support for more information.`
                });
            }

            if (!user.isApproved) {
                return res.status(403).json({
                    success: false,
                    message: 'Your account is not approved yet. Please wait for admin approval.'
                });
            }

            // Find the CompanyUser (super-admin)
            const companyUser = await CompanyUser.findOne({ 
                email: email,
                company: user._id 
            }).populate('company', 'name email companyLocation gstNumber');

            if (!companyUser) {
                return res.status(500).json({
                    success: false,
                    message: 'Company user account not found. Please contact support.'
                });
            }

            // Check if company user is active
            if (!companyUser.isActive) {
                return res.status(401).json({
                    success: false,
                    message: 'Your account has been deactivated. Please contact support.'
                });
            }

            // Generate token for company user
            const token = generateToken(companyUser._id, companyUser.role, 'company-user', user._id);

            return res.status(200).json({
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
                            name: companyUser.company.name,
                            companyLocation: companyUser.company.companyLocation,
                            gstNumber: companyUser.company.gstNumber
                        }
                    },
                    token
                }
            });
        }

        // Check approval status for vendor
        if (user.role === 'vendor') {
            if (user.approvalStatus === 'pending') {
                return res.status(403).json({
                    success: false,
                    message: 'Your account is pending approval from admin. You will be able to login once your account is approved.'
                });
            }
            
            if (user.approvalStatus === 'rejected') {
                return res.status(403).json({
                    success: false,
                    message: `Your account has been rejected. Reason: ${user.rejectionReason || 'Not specified'}. Please contact support for more information.`
                });
            }

            if (!user.isApproved) {
                return res.status(403).json({
                    success: false,
                    message: 'Your account is not approved yet. Please wait for admin approval.'
                });
            }
        }

        // Generate token for regular users (admin, sub-admin, vendor)
        const token = generateToken(user._id, user.role);

        // Prepare response data
        const responseData = {
            id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            isApproved: user.isApproved,
            approvalStatus: user.approvalStatus
        };

        // Add role-specific fields to response
        if (user.role === 'vendor') {
            responseData.gstNumber = user.gstNumber;
            responseData.panCard = user.panCard;
            responseData.vendorLocation = user.vendorLocation;
        }

        res.status(200).json({
            success: true,
            message: 'Login successful',
            data: {
                user: responseData,
                token
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
};

// @desc    Get current logged in user
// @route   GET /api/auth/me
// @access  Private
exports.getMe = async (req, res) => {
    try {
        // Check if it's a company user (from token)
        if (req.user.role && ['super-admin', 'company-admin', 'user'].includes(req.user.role)) {
            const companyUser = await CompanyUser.findById(req.user.id).populate('company', 'name email companyLocation gstNumber');
            
            if (!companyUser) {
                return res.status(404).json({
                    success: false,
                    message: 'User not found'
                });
            }

            return res.status(200).json({
                success: true,
                data: {
                    user: {
                        id: companyUser._id,
                        name: companyUser.name,
                        email: companyUser.email,
                        role: companyUser.role,
                        isActive: companyUser.isActive,
                        company: companyUser.company,
                        createdAt: companyUser.createdAt
                    }
                }
            });
        }

        // Regular user (admin, sub-admin, vendor, company entity)
        const user = await User.findById(req.user.id);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Prepare response data
        const responseData = {
            id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            isApproved: user.isApproved,
            approvalStatus: user.approvalStatus
        };

        // Add role-specific fields to response
        if (user.role === 'vendor') {
            responseData.gstNumber = user.gstNumber;
            responseData.panCard = user.panCard;
            responseData.vendorLocation = user.vendorLocation;
        }

        if (user.role === 'company') {
            responseData.gstNumber = user.gstNumber;
            responseData.panCard = user.panCard;
            responseData.companyLocation = user.companyLocation;
        }

        res.status(200).json({
            success: true,
            data: {
                user: responseData
            }
        });
    } catch (error) {
        console.error('GetMe error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
};

// @desc    Get all vendors with filters
// @route   GET /api/auth/vendors?status=pending&page=1&limit=10
// @access  Private/Admin
exports.getAllVendors = async (req, res) => {
    try {
        const { status, page = 1, limit = 10, search } = req.query;

        // Build filter query
        const filter = { role: 'vendor' };

        // Add status filter if provided
        if (status && ['pending', 'approved', 'rejected'].includes(status)) {
            filter.approvalStatus = status;
        }

        // Add search filter (name or email)
        if (search) {
            filter.$or = [
                { name: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } },
                { gstNumber: { $regex: search, $options: 'i' } }
            ];
        }

        // Calculate pagination
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const skip = (pageNum - 1) * limitNum;

        // Get total count
        const totalVendors = await User.countDocuments(filter);

        // Get vendors with pagination
        const vendors = await User.find(filter)
            .select('-password')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limitNum)
            .populate('approvedBy', 'name email');

        // Calculate pagination info
        const totalPages = Math.ceil(totalVendors / limitNum);

        res.status(200).json({
            success: true,
            count: vendors.length,
            totalVendors,
            totalPages,
            currentPage: pageNum,
            data: vendors,
            pagination: {
                page: pageNum,
                limit: limitNum,
                totalPages,
                totalRecords: totalVendors,
                hasNextPage: pageNum < totalPages,
                hasPrevPage: pageNum > 1
            }
        });
    } catch (error) {
        console.error('Get vendors error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
};

// @desc    Get all companies with filters
// @route   GET /api/auth/companies?status=pending&page=1&limit=10
// @access  Private/Admin
exports.getAllCompanies = async (req, res) => {
    try {
        const { status, page = 1, limit = 10, search } = req.query;

        // Build filter query
        const filter = { role: 'company' };

        // Add status filter if provided
        if (status && ['pending', 'approved', 'rejected'].includes(status)) {
            filter.approvalStatus = status;
        }

        // Add search filter (name or email)
        if (search) {
            filter.$or = [
                { name: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } },
                { companyLocation: { $regex: search, $options: 'i' } }
            ];
        }

        // Calculate pagination
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const skip = (pageNum - 1) * limitNum;

        // Get total count
        const totalCompanies = await User.countDocuments(filter);

        // Get companies with pagination
        const companies = await User.find(filter)
            .select('-password')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limitNum)
            .populate('approvedBy', 'name email');

        // Calculate pagination info
        const totalPages = Math.ceil(totalCompanies / limitNum);

        res.status(200).json({
            success: true,
            count: companies.length,
            totalCompanies,
            totalPages,
            currentPage: pageNum,
            data: companies,
            pagination: {
                page: pageNum,
                limit: limitNum,
                totalPages,
                totalRecords: totalCompanies,
                hasNextPage: pageNum < totalPages,
                hasPrevPage: pageNum > 1
            }
        });
    } catch (error) {
        console.error('Get companies error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
};

// @desc    Get summary statistics
// @route   GET /api/auth/stats
// @access  Private/Admin
exports.getStats = async (req, res) => {
    try {
        const stats = {
            vendors: {
                total: await User.countDocuments({ role: 'vendor' }),
                pending: await User.countDocuments({ role: 'vendor', approvalStatus: 'pending' }),
                approved: await User.countDocuments({ role: 'vendor', approvalStatus: 'approved' }),
                rejected: await User.countDocuments({ role: 'vendor', approvalStatus: 'rejected' })
            },
            companies: {
                total: await User.countDocuments({ role: 'company' }),
                pending: await User.countDocuments({ role: 'company', approvalStatus: 'pending' }),
                approved: await User.countDocuments({ role: 'company', approvalStatus: 'approved' }),
                rejected: await User.countDocuments({ role: 'company', approvalStatus: 'rejected' })
            },
            admins: {
                total: await User.countDocuments({ role: 'admin' })
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

// @desc    Approve user account (Admin only)
// @route   PUT /api/auth/approve/:userId
// @access  Private/Admin
exports.approveUser = async (req, res) => {
    try {
        const user = await User.findById(req.params.userId);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        if (user.approvalStatus === 'approved') {
            return res.status(400).json({
                success: false,
                message: 'User is already approved'
            });
        }

        user.isApproved = true;
        user.approvalStatus = 'approved';
        user.approvedBy = req.user.id;
        user.approvedAt = Date.now();
        user.rejectionReason = undefined;

        await user.save();

        // If approving a company, also activate the company super-admin
        if (user.role === 'company') {
            try {
                await CompanyUser.findOneAndUpdate(
                    { company: user._id, role: 'super-admin' },
                    { isActive: true }
                );
            } catch (companyUserError) {
                console.error('Error activating company super-admin:', companyUserError);
            }
        }

        res.status(200).json({
            success: true,
            message: `${user.role.charAt(0).toUpperCase() + user.role.slice(1)} approved successfully`,
            data: {
                user: {
                    id: user._id,
                    name: user.name,
                    email: user.email,
                    role: user.role,
                    approvalStatus: user.approvalStatus,
                    approvedAt: user.approvedAt
                }
            }
        });
    } catch (error) {
        console.error('Approve user error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
};

// @desc    Reject user account (Admin only)
// @route   PUT /api/auth/reject/:userId
// @access  Private/Admin
exports.rejectUser = async (req, res) => {
    try {
        const { reason } = req.body;
        const user = await User.findById(req.params.userId);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        if (user.approvalStatus === 'rejected') {
            return res.status(400).json({
                success: false,
                message: 'User is already rejected'
            });
        }

        user.isApproved = false;
        user.approvalStatus = 'rejected';
        user.rejectionReason = reason || 'Not specified';
        user.approvedBy = req.user.id;

        await user.save();

        // If rejecting a company, also deactivate the company super-admin
        if (user.role === 'company') {
            try {
                await CompanyUser.findOneAndUpdate(
                    { company: user._id, role: 'super-admin' },
                    { isActive: false }
                );
            } catch (companyUserError) {
                console.error('Error deactivating company super-admin:', companyUserError);
            }
        }

        res.status(200).json({
            success: true,
            message: `${user.role.charAt(0).toUpperCase() + user.role.slice(1)} rejected successfully`,
            data: {
                user: {
                    id: user._id,
                    name: user.name,
                    email: user.email,
                    role: user.role,
                    approvalStatus: user.approvalStatus,
                    rejectionReason: user.rejectionReason
                }
            }
        });
    } catch (error) {
        console.error('Reject user error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
};

// @desc    Bulk approve users/vendors
// @route   PUT /api/auth/bulk-approve
// @access  Private/Admin
exports.bulkApprove = async (req, res) => {
    try {
        const { userIds } = req.body;

        if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Please provide an array of user IDs'
            });
        }

        const result = await User.updateMany(
            { _id: { $in: userIds }, approvalStatus: { $ne: 'approved' } },
            {
                $set: {
                    isApproved: true,
                    approvalStatus: 'approved',
                    approvedBy: req.user.id,
                    approvedAt: Date.now(),
                    rejectionReason: undefined
                }
            }
        );

        res.status(200).json({
            success: true,
            message: `${result.modifiedCount} user(s) approved successfully`,
            data: {
                modifiedCount: result.modifiedCount
            }
        });
    } catch (error) {
        console.error('Bulk approve error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
};

// @desc    Bulk reject users/vendors
// @route   PUT /api/auth/bulk-reject
// @access  Private/Admin
exports.bulkReject = async (req, res) => {
    try {
        const { userIds, reason } = req.body;

        if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Please provide an array of user IDs'
            });
        }

        const result = await User.updateMany(
            { _id: { $in: userIds }, approvalStatus: { $ne: 'rejected' } },
            {
                $set: {
                    isApproved: false,
                    approvalStatus: 'rejected',
                    rejectionReason: reason || 'Not specified',
                    approvedBy: req.user.id
                }
            }
        );

        res.status(200).json({
            success: true,
            message: `${result.modifiedCount} user(s) rejected successfully`,
            data: {
                modifiedCount: result.modifiedCount
            }
        });
    } catch (error) {
        console.error('Bulk reject error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
};

// @desc    Forgot password - Send OTP
// @route   POST /api/auth/forgot-password
// @access  Public
exports.forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({
                success: false,
                message: 'Please provide email address'
            });
        }

        // Find user by email in User model first
        let user = await User.findOne({ email });
        let isCompanyUser = false;

        // If not found in User, check CompanyUser
        if (!user) {
            user = await CompanyUser.findOne({ email });
            if (user) {
                isCompanyUser = true;
            }
        }

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'No user found with this email address'
            });
        }

        // Check if user is active
        if (!user.isActive) {
            return res.status(400).json({
                success: false,
                message: 'Your account has been deactivated. Please contact support.'
            });
        }

        // Generate OTP
        const otp = user.generateResetPasswordOTP();

        // Save user with OTP
        await user.save({ validateBeforeSave: false });

        // Send OTP email
        try {
            await sendOTPEmail(email, user.name, otp);

            res.status(200).json({
                success: true,
                message: 'OTP has been sent to your email address. Please check your inbox.'
            });
        } catch (emailError) {
            // If email fails, remove OTP from database
            user.resetPasswordOTP = undefined;
            user.resetPasswordOTPExpire = undefined;
            await user.save({ validateBeforeSave: false });

            console.error('Error sending OTP email:', emailError);
            return res.status(500).json({
                success: false,
                message: 'Error sending email. Please try again later.'
            });
        }
    } catch (error) {
        console.error('Forgot password error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
};

// @desc    Verify OTP
// @route   POST /api/auth/verify-otp
// @access  Public
exports.verifyOTP = async (req, res) => {
    try {
        const { email, otp } = req.body;

        if (!email || !otp) {
            return res.status(400).json({
                success: false,
                message: 'Please provide email and OTP'
            });
        }

        // Find user and include OTP fields in User model first
        let user = await User.findOne({ email })
            .select('+resetPasswordOTP +resetPasswordOTPExpire');

        // If not found in User, check CompanyUser
        if (!user) {
            user = await CompanyUser.findOne({ email })
                .select('+resetPasswordOTP +resetPasswordOTPExpire');
        }

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'Invalid email or OTP'
            });
        }

        // Check if OTP exists
        if (!user.resetPasswordOTP || !user.resetPasswordOTPExpire) {
            return res.status(400).json({
                success: false,
                message: 'No OTP request found. Please request a new OTP.'
            });
        }

        // Check if OTP has expired
        if (user.resetPasswordOTPExpire < Date.now()) {
            return res.status(400).json({
                success: false,
                message: 'OTP has expired. Please request a new one.'
            });
        }

        // Verify OTP
        const isOTPValid = bcrypt.compareSync(otp, user.resetPasswordOTP);

        if (!isOTPValid) {
            return res.status(400).json({
                success: false,
                message: 'Invalid OTP. Please check and try again.'
            });
        }

        res.status(200).json({
            success: true,
            message: 'OTP verified successfully. You can now reset your password.'
        });
    } catch (error) {
        console.error('Verify OTP error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
};

// @desc    Reset password
// @route   POST /api/auth/reset-password
// @access  Public
exports.resetPassword = async (req, res) => {
    try {
        const { email, otp, newPassword } = req.body;

        if (!email || !otp || !newPassword) {
            return res.status(400).json({
                success: false,
                message: 'Please provide email, OTP, and new password'
            });
        }

        // Validate password length
        if (newPassword.length < 6) {
            return res.status(400).json({
                success: false,
                message: 'Password must be at least 6 characters long'
            });
        }

        // Find user and include OTP and password fields in User model first
        let user = await User.findOne({ email })
            .select('+resetPasswordOTP +resetPasswordOTPExpire +password');

        // If not found in User, check CompanyUser
        if (!user) {
            user = await CompanyUser.findOne({ email })
                .select('+resetPasswordOTP +resetPasswordOTPExpire +password');
        }

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'Invalid email or OTP'
            });
        }

        // Check if OTP exists
        if (!user.resetPasswordOTP || !user.resetPasswordOTPExpire) {
            return res.status(400).json({
                success: false,
                message: 'No OTP request found. Please request a new OTP.'
            });
        }

        // Check if OTP has expired
        if (user.resetPasswordOTPExpire < Date.now()) {
            return res.status(400).json({
                success: false,
                message: 'OTP has expired. Please request a new one.'
            });
        }

        // Verify OTP
        const isOTPValid = bcrypt.compareSync(otp, user.resetPasswordOTP);

        if (!isOTPValid) {
            return res.status(400).json({
                success: false,
                message: 'Invalid OTP. Please check and try again.'
            });
        }

        // Set new password (pre-save hook will hash it)
        user.password = newPassword;
        user.resetPasswordOTP = undefined;
        user.resetPasswordOTPExpire = undefined;

        await user.save();

        res.status(200).json({
            success: true,
            message: 'Password reset successful. You can now login with your new password.'
        });
    } catch (error) {
        console.error('Reset password error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
};