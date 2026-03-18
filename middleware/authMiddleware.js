const jwt = require('jsonwebtoken');
const User = require('../models/User');
const CompanyUser = require('../models/CompanyUser');

// Protect routes - verify token
exports.protect = async (req, res, next) => {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
        return res.status(401).json({
            success: false,
            message: 'Not authorized to access this route'
        });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Check if it's a company user token
        if (decoded.userType === 'company-user') {
            req.user = await CompanyUser.findById(decoded.id).populate('company');
            
            if (!req.user) {
                return res.status(401).json({
                    success: false,
                    message: 'User not found'
                });
            }

            // Check if user is active
            if (!req.user.isActive) {
                return res.status(401).json({
                    success: false,
                    message: 'Your account has been deactivated'
                });
            }

            // Add decoded info to req.user for easy access
            req.user.role = decoded.role;
            req.user.companyId = decoded.companyId;
        } else {
            // Regular user
            req.user = await User.findById(decoded.id);

            if (!req.user) {
                return res.status(401).json({
                    success: false,
                    message: 'User not found'
                });
            }
        }

        next();
    } catch (error) {
        return res.status(401).json({
            success: false,
            message: 'Not authorized to access this route'
        });
    }
};

// Grant access to specific roles
exports.authorize = (...roles) => {
    return (req, res, next) => {
        // Explicitly whitelist admin roles
        const allowedRoles = [...roles, 'admin', 'super-admin', 'sub-admin'];
        
        if (!allowedRoles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: `User role '${req.user.role}' is not authorized to access this route`
            });
        }
        next();
    };
};

// Optional authentication - sets req.user if token is present, but doesn't fail if missing
exports.optionalAuth = async (req, res, next) => {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
    }

    // If no token, just continue without setting req.user
    if (!token) {
        return next();
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Check if it's a company user or regular user
        if (decoded.userType === 'company-user') {
            req.user = await CompanyUser.findById(decoded.id);
            if (req.user) {
                req.user.role = decoded.role;
                req.user.companyId = decoded.companyId;
            }
        } else {
            req.user = await User.findById(decoded.id);
        }
        
        // If user not found, continue without req.user
        if (!req.user) {
            return next();
        }

        next();
    } catch (error) {
        // If token is invalid, just continue without req.user
        next();
    }
};

// Protect company routes - verify token for company users
exports.protectCompany = async (req, res, next) => {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
        return res.status(401).json({
            success: false,
            message: 'Not authorized to access this route'
        });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Verify it's a company user token
        if (decoded.userType !== 'company-user') {
            return res.status(401).json({
                success: false,
                message: 'Invalid token type'
            });
        }

        req.user = await CompanyUser.findById(decoded.id).populate('company');

        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'User not found'
            });
        }

        // Check if user is active
        if (!req.user.isActive) {
            return res.status(401).json({
                success: false,
                message: 'Your account has been deactivated'
            });
        }

        // Add decoded info to req.user for easy access
        req.user.companyId = decoded.companyId;

        next();
    } catch (error) {
        return res.status(401).json({
            success: false,
            message: 'Not authorized to access this route'
        });
    }
};

// Grant access to specific company roles
exports.authorizeCompanyRole = (...roles) => {
    return (req, res, next) => {
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: `User role '${req.user.role}' is not authorized to access this route`
            });
        }
        next();
    };
};

// Authorize company users only (all company user roles)
exports.authorizeCompanyUser = (req, res, next) => {
    // Check if user is a company user (has companyId)
    if (!req.user.companyId) {
        return res.status(403).json({
            success: false,
            message: 'This route is only accessible to company users'
        });
    }
    next();
};