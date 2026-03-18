const cloudinary = require('../config/cloudinary');

const uploadPDFToCloudinary = async (fileBuffer, originalName) => {
    const cleanName = originalName.replace(/\.[^/.]+$/, '');

    const base64File = `data:application/pdf;base64,${fileBuffer.toString('base64')}`;

    const result = await cloudinary.uploader.upload(base64File, {
        resource_type: 'image',   // 🔥 EXPLICIT
        folder: 'certificates',
        public_id: `${Date.now()}_${cleanName}`,
        access_mode: 'public',
        type: 'upload'
    });

    return {
        url: result.secure_url,   // ✅ opens correctly
        publicId: result.public_id
    };
};

// Delete PDF (must match resource_type)
const deleteFileFromCloudinary = async (publicId) => {
    await cloudinary.uploader.destroy(publicId, {
        resource_type: 'image'
    });
    return true;
};

module.exports = {
    uploadPDFToCloudinary,
    deleteFileFromCloudinary
};
