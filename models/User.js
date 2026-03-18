const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
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
        enum: ['company', 'admin', 'vendor', 'sub-admin'],
        default: 'company'
    },
    gstNumber: {
        type: String,
        trim: true,
        uppercase: true,
        default: null
    },
    panCard: {
        type: String,
        trim: true,
        uppercase: true,
        default: null
    },
    companyLocation: {
        type: String,
        required: function() {
            return this.role === 'company';
        },
        trim: true,
    },
    vendorLocation: {
        type: String,
        required: function() {
            return this.role === 'vendor';
        },
        trim: true,
    },
    seCertificate: {
        url: {
            type: String,
            required: function() {
                return this.role === 'vendor' || this.role === 'company';
            }
        },
        publicId: {
            type: String,
            required: function() {
                return this.role === 'vendor' || this.role === 'company';
            }
        }
    },
    resetPasswordOTP: {
        type: String,
        select: false
    },
    resetPasswordOTPExpire: {
        type: Date,
        select: false
    },
    isApproved: {
        type: Boolean,
        default: function() {
            return this.role === 'admin' || this.role === 'sub-admin';
        }
    },
    approvalStatus: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: function() {
            return (this.role === 'admin' || this.role === 'sub-admin') ? 'approved' : 'pending';
        }
    },
    approvedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    approvedAt: {
        type: Date
    },
    rejectionReason: {
        type: String
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

// Hash password before saving
userSchema.pre('save', async function() {
    if (!this.isModified('password')) {
        return;
    }
    
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
});

// Method to compare password
userSchema.methods.comparePassword = async function(enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

// Method to generate and hash OTP
userSchema.methods.generateResetPasswordOTP = function() {
    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Hash OTP and set to resetPasswordOTP field
    this.resetPasswordOTP = bcrypt.hashSync(otp, 10);
    
    // Set expire time (10 minutes)
    this.resetPasswordOTPExpire = Date.now() + 10 * 60 * 1000;
    
    return otp;
};

module.exports = mongoose.model('User', userSchema);