const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const companyUserSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Please provide a name'],
        trim: true
    },
    email: {
        type: String,
        required: [true, 'Please provide an email'],
        unique: true,
        lowercase: true,
        trim: true,
        match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Please provide a valid email']
    },
    password: {
        type: String,
        required: [true, 'Please provide a password'],
        minlength: 6,
        select: false
    },
    role: {
        type: String,
        enum: ['super-admin', 'company-admin', 'user'],
        default: 'user'
    },
    company: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'Company reference is required']
    },
    branch: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Branch'
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'CompanyUser'
    },
    isActive: {
        type: Boolean,
        default: true
    },
    monthlyLimit: {
        type: Number,
        default: function() {
            return this.role === 'super-admin' ? null : 0;
        }
    },
    monthlySpent: {
        type: Number,
        default: 0
    },
    lastResetDate: {
        type: Date,
        default: Date.now
    },
    resetPasswordOTP: {
        type: String,
        select: false
    },
    resetPasswordOTPExpire: {
        type: Date,
        select: false
    }
}, {
    timestamps: true
});

// Hash password before saving
companyUserSchema.pre('save', async function() {
    if (!this.isModified('password')) {
        return;
    }
    
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
});

// Method to compare password
companyUserSchema.methods.comparePassword = async function(enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

// Method to generate and hash OTP
companyUserSchema.methods.generateResetPasswordOTP = function() {
    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Hash OTP and set to resetPasswordOTP field
    this.resetPasswordOTP = bcrypt.hashSync(otp, 10);
    
    // Set expire time (10 minutes)
    this.resetPasswordOTPExpire = Date.now() + 10 * 60 * 1000;
    
    return otp;
};

// Method to check and reset monthly spending
companyUserSchema.methods.checkAndResetMonthlySpending = async function() {
    const now = new Date();
    const lastReset = new Date(this.lastResetDate);
    
    // Check if a month has passed
    const monthsPassed = (now.getFullYear() - lastReset.getFullYear()) * 12 + 
                         (now.getMonth() - lastReset.getMonth());
    
    if (monthsPassed >= 1) {
        this.monthlySpent = 0;
        this.lastResetDate = now;
        await this.save();
    }
};

// Method to check if user can place order
companyUserSchema.methods.canPlaceOrder = async function(orderAmount) {
    // Super-admin has no limits
    if (this.role === 'super-admin') {
        return { canOrder: true, exceedsLimit: false };
    }
    
    // Check and reset monthly spending if needed
    await this.checkAndResetMonthlySpending();
    
    const potentialSpent = this.monthlySpent + orderAmount;
    
    // If no limit set, can't order (needs limit to be assigned)
    if (!this.monthlyLimit || this.monthlyLimit === 0) {
        return { canOrder: false, exceedsLimit: false, needsLimit: true };
    }
    
    return { 
        canOrder: potentialSpent <= this.monthlyLimit, 
        exceedsLimit: potentialSpent > this.monthlyLimit,
        remainingLimit: this.monthlyLimit - this.monthlySpent,
        potentialSpent
    };
};

module.exports = mongoose.model('CompanyUser', companyUserSchema);
