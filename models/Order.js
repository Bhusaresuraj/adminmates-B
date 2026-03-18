const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
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

const orderSchema = new mongoose.Schema({
    orderNumber: {
        type: String,
        unique: true
    },
    company: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    branch: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Branch'
    },
    orderedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'CompanyUser',
        required: true
    },
    orderPlacedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'CompanyUser',
        required: true
    },
    vendor: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    items: [orderItemSchema],
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
        enum: ['pending', 'approved', 'rejected', 'processing', 'shipped', 'delivered', 'cancelled'],
        default: 'pending'
    },
    vendorApprovalStatus: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'pending'
    },
    vendorApprovedAt: {
        type: Date
    },
    vendorRejectionReason: {
        type: String
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
    wasEscalated: {
        type: Boolean,
        default: false
    },
    escalationDetails: {
        escalatedFrom: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'CompanyUser'
        },
        escalatedTo: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'CompanyUser'
        },
        escalationLevel: {
            type: String,
            enum: ['user-to-admin', 'admin-to-superadmin']
        }
    },
    notes: {
        type: String
    },
    payment: {
        razorpayOrderId: {
            type: String
        },
        razorpayPaymentId: {
            type: String
        },
        razorpaySignature: {
            type: String
        },
        paymentStatus: {
            type: String,
            enum: ['pending', 'completed', 'failed'],
            default: 'pending'
        },
        paidAt: {
            type: Date
        },
        amount: {
            type: Number
        }
    },
    deliveryPartner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'DeliveryPartner'
    },
    deliveryAssignedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    deliveryAssignedAt: {
        type: Date
    }
}, {
    timestamps: true
});

// Generate order number before saving
orderSchema.pre('save', async function() {
    if (this.isNew && !this.orderNumber) {
        const count = await mongoose.model('Order').countDocuments();
        this.orderNumber = `ORD-${Date.now()}-${count + 1}`;
    }
});

module.exports = mongoose.model('Order', orderSchema);
