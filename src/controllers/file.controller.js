const File = require('../models/File');
const asyncHandler = require('express-async-handler');
const multer = require('multer');
const path = require('path');
const fileQueue = require('../services/fileQueue');

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

  // Add file to processing queue
  const job = await fileQueue.add('process-file', {
    file: file,
    userId: req.user._id
  });

  res.status(201).json({ 
    ...file.toObject(),
    jobId: job.id 
  });
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

// Add job status endpoint
exports.getJobStatus = asyncHandler(async (req, res) => {
  const job = await fileQueue.getJob(req.params.jobId);
  if (!job) {
    return res.status(404).json({ message: 'Job not found' });
  }
  
  const state = await job.getState();
  const progress = job.progress();
  
  res.json({ state, progress });
});