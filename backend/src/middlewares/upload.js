const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configure storage
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        // Use the environment variable for the upload path
        const uploadPath = process.env.FILE_UPLOAD_PATH || path.join(__dirname, '../../uploads');
        
        // Ensure the directory exists
        if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
        }
        
        cb(null, uploadPath);
    },
    filename: function (req, file, cb) {
        // Generate a unique filename
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

// Configure file filter
const fileFilter = (req, file, cb) => {
    // Allow all file types for now
    // You can add file type restrictions here if needed
    cb(null, true);
};

// Configure upload limits
const limits = {
    fileSize: process.env.NODE_ENV === 'test' 
        ? 20 * 1024 * 1024  // 20MB for tests
        : parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024, // Default to 10MB
};

// Create multer instance
const multerUpload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: limits
});

// Export both the multer instance and the middleware
module.exports = {
    // Export multer instance for route configuration
    upload: multerUpload,
    
    // Export middleware for error handling
    uploadMiddleware: (req, res, next) => {
        multerUpload.single('file')(req, res, (err) => {
            if (err instanceof multer.MulterError) {
                if (err.code === 'LIMIT_FILE_SIZE') {
                    return res.status(413).json({ 
                        error: `File too large. Maximum size is ${limits.fileSize / (1024 * 1024)}MB` 
                    });
                }
                return res.status(400).json({ error: err.message });
            } else if (err) {
                return res.status(500).json({ error: 'File upload failed' });
            }
            next();
        });
    }
};