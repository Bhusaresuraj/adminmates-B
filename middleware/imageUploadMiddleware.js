const multer = require('multer');

// Configure multer for memory storage (store in buffer)
const storage = multer.memoryStorage();

// File filter to accept only images
const imageFilter = (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
        cb(null, true);
    } else {
        cb(new Error('Only image files are allowed'), false);
    }
};

// Multer configuration for multiple images
const uploadImages = multer({
    storage: storage,
    fileFilter: imageFilter,
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB per image
        files: 10 // Maximum 10 images
    }
});

module.exports = { uploadImages };
