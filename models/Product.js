const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
    vendor: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'Vendor is required']
    },
    sku: {
        type: String,
        required: [true, 'SKU is required'],
        unique: true,
        trim: true,
        uppercase: true
    },
    brand: {
        type: String,
        required: [true, 'Brand is required'],
        trim: true
    },
    productName: {
        type: String,
        required: [true, 'Product name is required'],
        trim: true
    },
    description: {
        type: String,
        required: [true, 'Description is required'],
        trim: true
    },
    vendorPrice: {
        type: Number,
        required: [true, 'Vendor price is required'],
        min: [0, 'Vendor price cannot be negative']
    },
    adminCut: {
        type: Number,
        default: 0,
        min: [0, 'Admin cut cannot be negative']
    },
    adminGst: {
        type: Number,
        default: 0,
        min: [0, 'Admin GST cannot be negative']
    },
    adminGstAmount: {
        type: Number,
        default: 0,
        min: [0, 'Admin GST amount cannot be negative']
    },
    gstAmount: {
        type: Number,
        default: 0,
        min: [0, 'GST amount cannot be negative']
    },
    price: {
        type: Number,
        required: [true, 'Price is required'],
        min: [0, 'Price cannot be negative']
    },
    weight: {
        value: {
            type: Number,
            required: [true, 'Weight value is required']
        },
        unit: {
            type: String,
            enum: ['kg', 'g', 'mg', 'lb', 'oz'],
            default: 'kg'
        }
    },
    dimensions: {
        length: {
            type: Number,
            required: [true, 'Length is required']
        },
        width: {
            type: Number,
            required: [true, 'Width is required']
        },
        height: {
            type: Number,
            required: [true, 'Height is required']
        },
        unit: {
            type: String,
            enum: ['cm', 'm', 'mm', 'inch', 'ft'],
            default: 'cm'
        }
    },
    color: {
        type: String,
        required: [true, 'Color is required'],
        trim: true
    },
    material: {
        type: String,
        required: [true, 'Material is required'],
        trim: true
    },
    packSize: {
        type: String,
        required: [true, 'Pack size is required'],
        trim: true
    },
    uom: {
        type: String,
        required: [true, 'UOM (Unit of Measure) is required'],
        enum: ['piece', 'box', 'carton', 'pack', 'set', 'dozen', 'kg', 'litre', 'meter'],
        default: 'piece'
    },
    gstSlab: {
        type: Number,
        required: [true, 'GST slab is required'],
        enum: [0, 5, 12, 18, 28],
        default: 18
    },
    hsnCode: {
        type: String,
        required: [true, 'HSN code is required'],
        trim: true
    },
    images: [{
        url: {
            type: String,
            required: true
        },
        publicId: {
            type: String,
            required: true
        }
    }],
    category: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Category',
        required: [true, 'Category is required']
    },
    subCategory: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'SubCategory',
        required: [true, 'Sub-category is required']
    },
    status: {
        type: String,
        enum: ['active', 'inactive'],
        default: 'active'
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
    }
}, {
    timestamps: true
});

// Index for better query performance
productSchema.index({ vendor: 1, status: 1, approvalStatus: 1 });
productSchema.index({ category: 1, subCategory: 1, price: 1 });
productSchema.index({ productName: 'text', description: 'text', brand: 'text' });

module.exports = mongoose.model('Product', productSchema);
