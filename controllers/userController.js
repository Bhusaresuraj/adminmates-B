const User = require('../models/User'); // Adjust if required
const Product = require('../models/Product');
const Branch = require('../models/Branch');

// @desc    Update user profile (Admin Portal)
// @route   PUT /api/auth/users/:id
// @access  Private/Admin
exports.updateUser = async (req, res) => {
    try {
        const { name, email, companyLocation, vendorLocation } = req.body;
        const updatedUser = await User.findByIdAndUpdate(
            req.params.id,
            { name, email, companyLocation, vendorLocation },
            { new: true, runValidators: true }
        );

        if (!updatedUser) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        res.status(200).json({ success: true, message: 'User updated successfully', data: updatedUser });
    } catch (error) {
        console.error('Update user error:', error);
        res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
};

// @desc    Delete user profile (Admin Portal)
// @route   DELETE /api/auth/users/:id
// @access  Private/Admin
exports.deleteUser = async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        // Depending on your requirements, remove associated dependencies
        if (user.role === 'vendor') {
            await Product.deleteMany({ vendor: user._id });
        } else if (user.role === 'company') {
            await Branch.deleteMany({ company: user._id });
        }

        await user.deleteOne();

        res.status(200).json({ success: true, message: 'User deleted successfully' });
    } catch (error) {
        console.error('Delete user error:', error);
        res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
};