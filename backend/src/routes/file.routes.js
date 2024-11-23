const express = require('express');
const passport = require('passport');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const File = require('../models/File');
const router = express.Router();

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    // Add timestamp to prevent filename collisions
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

// Add file filter to check file types
const fileFilter = (req, file, cb) => {
  // Add allowed file types
  const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx|txt/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (extname && mimetype) {
    return cb(null, true);
  }
  cb(new Error('Only specific file formats are allowed!'));
};

const upload = multer({ 
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

router.use(passport.authenticate('jwt', { session: false }));

router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const file = new File({
      name: req.file.originalname,
      path: req.file.filename, // Store only filename, not full path
      size: req.file.size,
      owner: req.user._id
    });

    await file.save();
    res.status(201).json(file);
  } catch (error) {
    console.error('File upload error:', error);
    res.status(500).json({ message: error.message || 'Error uploading file' });
  }
});

router.get('/', async (req, res) => {
  try {
    const files = await File.find({ owner: req.user._id });
    // Add full URL to each file
    const filesWithUrls = files.map(file => ({
      ...file.toObject(),
      url: `/uploads/${file.path}` // Add URL for file access
    }));
    res.json(filesWithUrls);
  } catch (error) {
    console.error('Error fetching files:', error);
    res.status(500).json({ message: error.message || 'Error fetching files' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const file = await File.findOne({
      _id: req.params.id,
      owner: req.user._id
    });

    if (!file) {
      return res.status(404).json({ message: 'File not found' });
    }

    // Delete file from filesystem
    const filePath = path.join(uploadsDir, file.path);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    await File.deleteOne({ _id: file._id });
    res.json({ message: 'File deleted successfully' });
  } catch (error) {
    console.error('Error deleting file:', error);
    res.status(500).json({ message: error.message || 'Error deleting file' });
  }
});

// Use CommonJS export
module.exports = router;