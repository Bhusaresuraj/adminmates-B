const cloudinary = require('../config/cloudinary');

// Upload single image to Cloudinary
const uploadImageToCloudinary = async (fileBuffer, fileName) => {
    try {
        const base64File = `data:image/jpeg;base64,${fileBuffer.toString('base64')}`;
        
        const result = await cloudinary.uploader.upload(base64File, {
            resource_type: 'image',
            folder: 'products',
            public_id: `${Date.now()}_${fileName}`,
            access_mode: 'public',
            transformation: [
                { width: 1000, height: 1000, crop: 'limit' },
                { quality: 'auto' }
            ]
        });

        return {
            url: result.secure_url,
            publicId: result.public_id
        };
    } catch (error) {
        console.error('Cloudinary image upload error:', error);
        throw new Error(`Error uploading image: ${error.message}`);
    }
};

// Upload multiple images to Cloudinary
const uploadMultipleImagesToCloudinary = async (files) => {
    try {
        const uploadPromises = files.map((file, index) => {
            const fileName = `product_${Date.now()}_${index}`;
            return uploadImageToCloudinary(file.buffer, fileName);
        });

        return await Promise.all(uploadPromises);
    } catch (error) {
        console.error('Multiple images upload error:', error);
        throw new Error(`Error uploading images: ${error.message}`);
    }
};

// Delete image from Cloudinary
const deleteImageFromCloudinary = async (publicId) => {
    try {
        await cloudinary.uploader.destroy(publicId, { resource_type: 'image' });
        return true;
    } catch (error) {
        throw new Error(`Error deleting image: ${error.message}`);
    }
};

// Delete multiple images from Cloudinary
const deleteMultipleImagesFromCloudinary = async (publicIds) => {
    try {
        const deletePromises = publicIds.map(publicId => 
            cloudinary.uploader.destroy(publicId, { resource_type: 'image' })
        );
        await Promise.all(deletePromises);
        return true;
    } catch (error) {
        throw new Error(`Error deleting images: ${error.message}`);
    }
};

// Upload PDF to Cloudinary using base64 (fixes PDF loading issues)
const uploadPDFToCloudinary = async (fileBuffer, fileName) => {
    try {
        // Convert buffer to base64
        const base64File = `data:application/pdf;base64,${fileBuffer.toString('base64')}`;
        
        // Upload using base64
        const result = await cloudinary.uploader.upload(base64File, {
            resource_type: 'raw',
            folder: 'certificates',
            public_id: `${Date.now()}_${fileName}`,
            format: 'pdf',
            access_mode: 'public'
        });

        return {
            url: result.secure_url,
            publicId: result.public_id
        };
    } catch (error) {
        console.error('Cloudinary upload error:', error);
        throw new Error(`Error uploading file: ${error.message}`);
    }
};

// Delete file from Cloudinary
const deleteFileFromCloudinary = async (publicId) => {
    try {
        await cloudinary.uploader.destroy(publicId, { resource_type: 'raw' });
        return true;
    } catch (error) {
        throw new Error(`Error deleting file: ${error.message}`);
    }
};

module.exports = {
    uploadImageToCloudinary,
    uploadMultipleImagesToCloudinary,
    deleteImageFromCloudinary,
    deleteMultipleImagesFromCloudinary,
    uploadPDFToCloudinary,
    deleteFileFromCloudinary
};
