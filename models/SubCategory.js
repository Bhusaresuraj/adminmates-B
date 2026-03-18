const mongoose = require('mongoose');

const subCategorySchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Sub-category name is required'],
        trim: true
    },
    description: {
        type: String,
        trim: true
    },
    category: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Category',
        required: [true, 'Category is required']
    },
    isActive: {
        type: String,
        enum: ['active', 'inactive'],
        default: 'active'
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    }
}, {
    timestamps: true
});

// Compound unique index - same name can exist in different categories
subCategorySchema.index({ name: 1, category: 1 }, { unique: true });
subCategorySchema.index({ category: 1 });
subCategorySchema.index({ isActive: 1 });

module.exports = mongoose.model('SubCategory', subCategorySchema);
