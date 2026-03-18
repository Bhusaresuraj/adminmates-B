const mongoose = require('mongoose');

const deliveryPartnerSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Please provide delivery partner name'],
        trim: true
    },
    email: {
        type: String,
        required: [true, 'Please provide email'],
        unique: true,
        lowercase: true,
        trim: true,
        match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Please provide a valid email']
    },
    phone: {
        type: String,
        required: [true, 'Please provide phone number'],
        trim: true,
        match: [/^[0-9]{10}$/, 'Please provide a valid 10-digit phone number']
    },
    alternatePhone: {
        type: String,
        trim: true,
        match: [/^[0-9]{10}$/, 'Please provide a valid 10-digit phone number']
    },
    vehicleType: {
        type: String,
        enum: ['bike', 'car', 'van', 'truck'],
        required: [true, 'Please provide vehicle type']
    },
    vehicleNumber: {
        type: String,
        required: [true, 'Please provide vehicle number'],
        trim: true,
        uppercase: true
    },
    drivingLicense: {
        type: String,
        required: [true, 'Please provide driving license number'],
        trim: true,
        uppercase: true
    },
    address: {
        street: {
            type: String,
            trim: true
        },
        city: {
            type: String,
            trim: true
        },
        state: {
            type: String,
            trim: true
        },
        pincode: {
            type: String,
            trim: true
        }
    },
    isActive: {
        type: Boolean,
        default: true
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    totalDeliveries: {
        type: Number,
        default: 0
    },
    rating: {
        type: Number,
        min: 0,
        max: 5,
        default: 0
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('DeliveryPartner', deliveryPartnerSchema);
