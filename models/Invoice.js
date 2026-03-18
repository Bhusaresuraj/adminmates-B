const mongoose = require('mongoose');

const invoiceItemSchema = new mongoose.Schema({
    product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        required: true
    },
    productName: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    hsnCode: {
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
    pricePerUnit: {
        type: Number,
        required: true
    },
    totalPrice: {
        type: Number,
        required: true
    },
    gstRate: {
        type: Number,
        required: true,
        default: 18
    },
    gstAmount: {
        type: Number,
        required: true
    },
    totalWithGst: {
        type: Number,
        required: true
    }
});

const invoiceSchema = new mongoose.Schema({
    invoiceNumber: {
        type: String,
        unique: true
    },
    invoiceDate: {
        type: Date,
        default: Date.now
    },
    order: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Order',
        required: true,
        unique: true
    },
    deliveryChallan: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'DeliveryChallan'
    },
    company: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    companyDetails: {
        name: String,
        gstNumber: String,
        panCard: String,
        location: String
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
    vendor: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    items: [invoiceItemSchema],
    subtotal: {
        type: Number,
        required: true
    },
    totalGst: {
        type: Number,
        required: true
    },
    grandTotal: {
        type: Number,
        required: true
    },
    amountInWords: {
        type: String,
        required: true
    },
    paymentStatus: {
        type: String,
        enum: ['pending', 'completed', 'failed'],
        default: 'pending'
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
        paidAt: {
            type: Date
        },
        amount: {
            type: Number
        }
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    notes: {
        type: String
    }
}, {
    timestamps: true
});

// Generate invoice number before saving
invoiceSchema.pre('save', async function() {
    if (this.isNew && !this.invoiceNumber) {
        const count = await mongoose.model('Invoice').countDocuments();
        const year = new Date().getFullYear();
        const month = String(new Date().getMonth() + 1).padStart(2, '0');
        this.invoiceNumber = `INV-${year}${month}-${String(count + 1).padStart(5, '0')}`;
    }
});

module.exports = mongoose.model('Invoice', invoiceSchema);
