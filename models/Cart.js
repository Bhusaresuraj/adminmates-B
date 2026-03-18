const mongoose = require('mongoose');

const cartItemSchema = new mongoose.Schema({
    product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        required: true
    },
    quantity: {
        type: Number,
        required: true,
        min: [1, 'Quantity cannot be less than 1'],
        default: 1
    },
    price: {
        type: Number,
        required: true
    },
    addedAt: {
        type: Date,
        default: Date.now
    }
});

const cartSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'CompanyUser',
        required: true,
        unique: true
    },
    company: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    items: [cartItemSchema],
    totalAmount: {
        type: Number,
        default: 0
    },
    totalItems: {
        type: Number,
        default: 0
    }
}, {
    timestamps: true
});

// Method to calculate cart total
cartSchema.methods.calculateTotal = function() {
    this.totalItems = this.items.reduce((total, item) => total + item.quantity, 0);
    this.totalAmount = this.items.reduce((total, item) => total + (item.price * item.quantity), 0);
};

// Update total before saving
cartSchema.pre('save', function() {
    this.calculateTotal();
});

module.exports = mongoose.model('Cart', cartSchema);
