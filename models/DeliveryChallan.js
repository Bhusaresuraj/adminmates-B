const mongoose = require('mongoose');

const deliveryChallanItemSchema = new mongoose.Schema({
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
    pricePerUnit: {
        type: Number,
        required: true
    },
    totalPrice: {
        type: Number,
        required: true
    }
});

const deliveryChallanSchema = new mongoose.Schema({
    challanNumber: {
        type: String,
        unique: true
    },
    order: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Order',
        required: true
    },
    vendor: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    company: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    items: [deliveryChallanItemSchema],
    subtotal: {
        type: Number,
        required: true
    },
    notes: {
        type: String
    },
    status: {
        type: String,
        enum: ['pending', 'delivered', 'cancelled'],
        default: 'pending'
    }
}, {
    timestamps: true
});

// Generate challan number before saving
deliveryChallanSchema.pre('save', async function() {
    if (this.isNew && !this.challanNumber) {
        const count = await mongoose.model('DeliveryChallan').countDocuments();
        this.challanNumber = `DC-${Date.now()}-${count + 1}`;
    }
});

module.exports = mongoose.model('DeliveryChallan', deliveryChallanSchema);
