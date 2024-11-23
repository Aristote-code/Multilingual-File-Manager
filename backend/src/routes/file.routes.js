const express = require('express');
const passport = require('passport');
const multer = require('multer');
const path = require('path');
const File = require('../models/File');
const router = express.Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({ storage });

router.use(passport.authenticate('jwt', { session: false }));

router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    const file = new File({
      name: req.file.originalname,
      path: req.file.path,
      size: req.file.size,
      owner: req.user._id
    });

    await file.save();
    res.status(201).json(file);
  } catch (error) {
    res.status(500).json({ message: 'Error uploading file' });
  }
});

router.get('/', async (req, res) => {
  try {
    const files = await File.find({ owner: req.user._id });
    res.json(files);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching files' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const file = await File.findOneAndDelete({
      _id: req.params.id,
      owner: req.user._id
    });

    if (!file) {
      return res.status(404).json({ message: 'File not found' });
    }

    res.json({ message: 'File deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting file' });
  }
});

exports.fileRoutes = router;