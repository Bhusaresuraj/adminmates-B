const Category = require('../models/Category');
const SubCategory = require('../models/SubCategory');

// @desc    Create category (Admin only)
// @route   POST /api/admin/categories
// @access  Private/Admin
exports.createCategory = async (req, res) => {
    try {
        const { name, description } = req.body;

        // Validate input
        if (!name) {
            return res.status(400).json({
                success: false,
                message: 'Category name is required'
            });
        }

        // Check if category already exists
        const existingCategory = await Category.findOne({ name: name.trim() });
        if (existingCategory) {
            return res.status(400).json({
                success: false,
                message: 'Category with this name already exists'
            });
        }

        // Create category
        const category = await Category.create({
            name: name.trim(),
            description: description?.trim(),
            createdBy: req.user.id
        });

        res.status(201).json({
            success: true,
            message: 'Category created successfully',
            data: category
        });
    } catch (error) {
        console.error('Create category error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
};

// @desc    Get all categories
// @route   GET /api/admin/categories?isActive=active&page=1&limit=10
// @access  Private/Admin
exports.getAllCategories = async (req, res) => {
    try {
        const { isActive, page = 1, limit = 100 } = req.query;

        // Build filter query
        const filter = {};
        if (isActive && ['active', 'inactive'].includes(isActive)) {
            filter.isActive = isActive;
        }

        // Pagination
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const skip = (pageNum - 1) * limitNum;

        // Get total count
        const totalCategories = await Category.countDocuments(filter);

        // Get categories with pagination
        const categories = await Category.find(filter)
            .sort({ name: 1 })
            .skip(skip)
            .limit(limitNum)
            .populate('createdBy', 'name email');

        // Calculate pagination info
        const totalPages = Math.ceil(totalCategories / limitNum);

        res.status(200).json({
            success: true,
            count: categories.length,
            totalCategories,
            totalPages,
            currentPage: pageNum,
            data: categories,
            pagination: {
                page: pageNum,
                limit: limitNum,
                totalPages,
                totalRecords: totalCategories,
                hasNextPage: pageNum < totalPages,
                hasPrevPage: pageNum > 1
            }
        });
    } catch (error) {
        console.error('Get categories error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
};

// @desc    Create sub-category (Admin only)
// @route   POST /api/admin/sub-categories
// @access  Private/Admin
exports.createSubCategory = async (req, res) => {
    try {
        const { name, description, categoryId } = req.body;

        // Validate input
        if (!name || !categoryId) {
            return res.status(400).json({
                success: false,
                message: 'Sub-category name and category ID are required'
            });
        }

        // Check if category exists
        const category = await Category.findById(categoryId);
        if (!category) {
            return res.status(404).json({
                success: false,
                message: 'Category not found'
            });
        }

        // Check if sub-category already exists in this category
        const existingSubCategory = await SubCategory.findOne({
            name: name.trim(),
            category: categoryId
        });
        if (existingSubCategory) {
            return res.status(400).json({
                success: false,
                message: 'Sub-category with this name already exists in this category'
            });
        }

        // Create sub-category
        const subCategory = await SubCategory.create({
            name: name.trim(),
            description: description?.trim(),
            category: categoryId,
            createdBy: req.user.id
        });

        // Populate category details
        await subCategory.populate('category', 'name');

        res.status(201).json({
            success: true,
            message: 'Sub-category created successfully',
            data: subCategory
        });
    } catch (error) {
        console.error('Create sub-category error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
};

// @desc    Get all sub-categories with optional category filter
// @route   GET /api/admin/sub-categories?categoryId=xxx&isActive=active&page=1&limit=10
// @access  Private/Admin
exports.getAllSubCategories = async (req, res) => {
    try {
        const { categoryId, isActive, page = 1, limit = 100 } = req.query;

        // Build filter query
        const filter = {};
        
        if (categoryId) {
            filter.category = categoryId;
        }

        if (isActive && ['active', 'inactive'].includes(isActive)) {
            filter.isActive = isActive;
        }

        // Pagination
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const skip = (pageNum - 1) * limitNum;

        // Get total count
        const totalSubCategories = await SubCategory.countDocuments(filter);

        // Get sub-categories with pagination
        const subCategories = await SubCategory.find(filter)
            .sort({ name: 1 })
            .skip(skip)
            .limit(limitNum)
            .populate('category', 'name')
            .populate('createdBy', 'name email');

        // Calculate pagination info
        const totalPages = Math.ceil(totalSubCategories / limitNum);

        res.status(200).json({
            success: true,
            count: subCategories.length,
            totalSubCategories,
            totalPages,
            currentPage: pageNum,
            data: subCategories,
            pagination: {
                page: pageNum,
                limit: limitNum,
                totalPages,
                totalRecords: totalSubCategories,
                hasNextPage: pageNum < totalPages,
                hasPrevPage: pageNum > 1
            }
        });
    } catch (error) {
        console.error('Get sub-categories error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
};

// @desc    Toggle category active status (Admin only)
// @route   PUT /api/admin/categories/:categoryId/toggle-status
// @access  Private/Admin
exports.toggleCategoryStatus = async (req, res) => {
    try {
        const { categoryId } = req.params;

        const category = await Category.findById(categoryId);

        if (!category) {
            return res.status(404).json({
                success: false,
                message: 'Category not found'
            });
        }

        // Toggle status
        category.isActive = category.isActive === 'active' ? 'inactive' : 'active';
        await category.save();

        res.status(200).json({
            success: true,
            message: `Category ${category.isActive === 'active' ? 'activated' : 'deactivated'} successfully`,
            data: category
        });
    } catch (error) {
        console.error('Toggle category status error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
};

// @desc    Toggle sub-category active status (Admin only)
// @route   PUT /api/admin/sub-categories/:subCategoryId/toggle-status
// @access  Private/Admin
exports.toggleSubCategoryStatus = async (req, res) => {
    try {
        const { subCategoryId } = req.params;

        const subCategory = await SubCategory.findById(subCategoryId);

        if (!subCategory) {
            return res.status(404).json({
                success: false,
                message: 'Sub-category not found'
            });
        }

        // Toggle status
        subCategory.isActive = subCategory.isActive === 'active' ? 'inactive' : 'active';
        await subCategory.save();

        res.status(200).json({
            success: true,
            message: `Sub-category ${subCategory.isActive === 'active' ? 'activated' : 'deactivated'} successfully`,
            data: subCategory
        });
    } catch (error) {
        console.error('Toggle sub-category status error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
};

// @desc    Delete category (Admin and Sub-admin)
// @route   DELETE /api/admin/categories/:categoryId
// @access  Private/Admin, Sub-admin
exports.deleteCategory = async (req, res) => {
    try {
        const { categoryId } = req.params;
        const Product = require('../models/Product');

        // Check if category exists
        const category = await Category.findById(categoryId);
        if (!category) {
            return res.status(404).json({
                success: false,
                message: 'Category not found'
            });
        }

        // Check if there are any products associated with this category
        const productsCount = await Product.countDocuments({ category: categoryId });
        if (productsCount > 0) {
            return res.status(400).json({
                success: false,
                message: `Cannot delete category. There are ${productsCount} product(s) associated with this category. Please remove or reassign the products first.`
            });
        }

        // Check if there are any sub-categories associated with this category
        const subCategoriesCount = await SubCategory.countDocuments({ category: categoryId });
        if (subCategoriesCount > 0) {
            return res.status(400).json({
                success: false,
                message: `Cannot delete category. There are ${subCategoriesCount} sub-category(ies) associated with this category. Please delete the sub-categories first.`
            });
        }

        // Delete the category
        await Category.findByIdAndDelete(categoryId);

        res.status(200).json({
            success: true,
            message: 'Category deleted successfully',
            data: {
                deletedCategory: {
                    id: category._id,
                    name: category.name
                }
            }
        });
    } catch (error) {
        console.error('Delete category error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
};

// @desc    Delete sub-category (Admin and Sub-admin)
// @route   DELETE /api/admin/sub-categories/:subCategoryId
// @access  Private/Admin, Sub-admin
exports.deleteSubCategory = async (req, res) => {
    try {
        const { subCategoryId } = req.params;
        const Product = require('../models/Product');

        // Check if sub-category exists
        const subCategory = await SubCategory.findById(subCategoryId).populate('category', 'name');
        if (!subCategory) {
            return res.status(404).json({
                success: false,
                message: 'Sub-category not found'
            });
        }

        // Check if there are any products associated with this sub-category
        const productsCount = await Product.countDocuments({ subCategory: subCategoryId });
        if (productsCount > 0) {
            return res.status(400).json({
                success: false,
                message: `Cannot delete sub-category. There are ${productsCount} product(s) associated with this sub-category. Please remove or reassign the products first.`
            });
        }

        // Delete the sub-category
        await SubCategory.findByIdAndDelete(subCategoryId);

        res.status(200).json({
            success: true,
            message: 'Sub-category deleted successfully',
            data: {
                deletedSubCategory: {
                    id: subCategory._id,
                    name: subCategory.name,
                    category: subCategory.category
                }
            }
        });
    } catch (error) {
        console.error('Delete sub-category error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
};
