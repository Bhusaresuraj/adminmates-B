const mongoose = require('mongoose');

const branchSchema = new mongoose.Schema({
    branchName: {
        type: String,
        required: [true, 'Please provide a branch name'],
        trim: true
    },
    address: {
        type: String,
        required: [true, 'Please provide branch address'],
        trim: true
    },
    city: {
        type: String,
        required: [true, 'Please provide branch city'],
        trim: true
    },
    state: {
        type: String,
        required: [true, 'Please provide branch state'],
        trim: true
    },
    company: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'Company reference is required']
    },
    companyName: {
        type: String,
        required: true
    },
    branchAdmin: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'CompanyUser',
        default: null
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'CompanyUser',
        required: true
    },
    gstNumber: {
        type: String,
        trim: true,
        uppercase: true,
    },
    panCard: {
        type: String,
        trim: true,
        uppercase: true,
    },
    isApproved: {
        type: Boolean,
        default: false
    },
    approvalStatus: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'pending'
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

module.exports = mongoose.model('Branch', branchSchema);
