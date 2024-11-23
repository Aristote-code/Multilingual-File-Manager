const File = require('../models/File');
const asyncHandler = require('express-async-handler');
const multer = require('multer');
const path = require('path');

const storage = multer.diskStorage({
  destination: './uploads',
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

const upload = multer({ storage });

exports.uploadFile = asyncHandler(async (req, res) => {
  const file = new File({
    name: req.file.originalname,
    path: req.file.path,
    size: req.file.size,
    owner: req.user._id
  });

  await file.save();
  res.status(201).json(file);
});

exports.getFiles = asyncHandler(async (req, res) => {
  const files = await File.find({ owner: req.user._id });
  res.json(files);
});

exports.deleteFile = asyncHandler(async (req, res) => {
  const file = await File.findOneAndDelete({
    _id: req.params.id,
    owner: req.user._id
  });

  if (!file) {
    return res.status(404).json({ message: 'File not found' });
  }

  res.json({ message: 'File deleted successfully' });
});