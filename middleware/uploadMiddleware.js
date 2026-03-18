const multer = require('multer');

const allowedPdfMimeTypes = new Set([
    'application/pdf',
    'application/x-pdf',
    'application/acrobat',
    'applications/vnd.pdf',
    'text/pdf',
    'application/octet-stream'
]);

// Configure multer for memory storage (store in buffer)
const storage = multer.memoryStorage();

// File filter to accept only PDFs
const fileFilter = (req, file, cb) => {
    const mimetype = file.mimetype ? file.mimetype.toLowerCase() : '';
    const originalName = file.originalname ? file.originalname.toLowerCase() : '';
    const isPdfMimeType = allowedPdfMimeTypes.has(mimetype);
    const hasPdfExtension = originalName.endsWith('.pdf');

    if (isPdfMimeType || hasPdfExtension) {
        cb(null, true);
    } else {
        cb(new Error('Only PDF files are allowed'), false);
    }
};

// Multer configuration
const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    }
});

module.exports = upload;
