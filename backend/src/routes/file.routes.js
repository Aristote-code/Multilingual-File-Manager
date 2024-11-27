const express = require('express');
const router = express.Router();
const fileController = require('../controllers/fileController');
const { auth } = require('../middlewares/auth');
const multer = require('multer');
const path = require('path');

// Configure multer
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadPath = process.env.FILE_UPLOAD_PATH || path.join(__dirname, '../../uploads');
        cb(null, uploadPath);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: process.env.NODE_ENV === 'test' 
            ? 20 * 1024 * 1024  // 20MB for tests
            : parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024 // Default to 10MB
    }
});

// Apply auth middleware to all routes
router.use(auth);

// File routes
router.post('/upload', upload.single('file'), fileController.uploadFile);
router.get('/', fileController.getFiles);
router.get('/search', fileController.searchFiles);
router.get('/progress/:taskId', fileController.checkProgress);
router.get('/download/:fileId', fileController.downloadFile);
router.delete('/:fileId', fileController.deleteFile);

module.exports = router;