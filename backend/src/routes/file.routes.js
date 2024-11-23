const express = require('express');
const path = require('path');
const fs = require('fs');
const router = express.Router();
const { auth } = require('../middlewares/auth');
const upload = require('../middlewares/upload');
const fileController = require('../controllers/fileController');

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// All routes require authentication
router.use(auth);

// File routes
router.post('/upload', upload.single('file'), fileController.uploadFile);
router.get('/', fileController.getFiles);
router.get('/search', fileController.searchFiles);
router.get('/progress/:taskId', fileController.checkProgress);
router.get('/:id', fileController.getFile);
router.get('/:id/download', fileController.downloadFile);
router.post('/:id/share', fileController.shareFile);
router.delete('/:id', fileController.deleteFile);

module.exports = router;