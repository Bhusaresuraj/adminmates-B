const mongoose = require('mongoose');

const escalationItemSchema = new mongoose.Schema({
    product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        required: true
    },
    productName: {
        type: String,
        required: true
    },
    sku: {
        type: String,
        required: true
    },
    quantity: {
        type: Number,
        required: true,
        min: 1
    },
    price: {
        type: Number,
        required: true
    },
    totalPrice: {
        type: Number,
        required: true
    }
});

const orderEscalationSchema = new mongoose.Schema({
    escalationNumber: {
        type: String,
        unique: true
    },
    company: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    requestedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'CompanyUser',
        required: true
    },
    escalatedTo: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'CompanyUser',
        required: true
    },
    escalationType: {
        type: String,
        enum: ['user-to-admin', 'admin-to-superadmin'],
        required: true
    },
    items: [escalationItemSchema],
    totalAmount: {
        type: Number,
        required: true
    },
    totalItems: {
        type: Number,
        required: true
    },
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected', 'cancelled'],
        default: 'pending'
    },
    requestReason: {
        type: String,
        required: true
    },
    responseMessage: {
        type: String
    },
    respondedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'CompanyUser'
    },
    respondedAt: {
        type: Date
    },
    order: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Order'
    },
    requesterLimit: {
        monthlyLimit: Number,
        monthlySpent: Number,
        remainingLimit: Number
    }
}, {
    timestamps: true
});

// Generate escalation number before saving
orderEscalationSchema.pre('save', async function() {
    if (this.isNew && !this.escalationNumber) {
        const count = await mongoose.model('OrderEscalation').countDocuments();
        this.escalationNumber = `ESC-${Date.now()}-${count + 1}`;
    }
});

module.exports = mongoose.model('OrderEscalation', orderEscalationSchema);
