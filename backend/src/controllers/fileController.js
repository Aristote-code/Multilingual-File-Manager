const File = require('../models/File');
const path = require('path');
const fs = require('fs').promises;
const crypto = require('crypto');
const queueService = require('../services/queueService');

const QUEUE_NAME = 'file-processing';
const LARGE_FILE_THRESHOLD = 5 * 1024 * 1024; // 5MB

// Upload file
exports.uploadFile = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const fileSize = req.file.size;

        if (fileSize > LARGE_FILE_THRESHOLD) {
            // For large files, add to processing queue
            const taskId = crypto.randomBytes(16).toString('hex');
            
            await queueService.addToQueue(QUEUE_NAME, {
                originalPath: req.file.path,
                userId: req.user._id,
                originalName: req.file.originalname,
                mimetype: req.file.mimetype,
                size: fileSize,
                taskId
            });

            return res.status(202).json({
                message: 'File queued for processing',
                taskId
            });
        }

        // For smaller files, process immediately
        const file = new File({
            filename: req.file.filename,
            originalName: req.file.originalname,
            path: req.file.path,
            size: req.file.size,
            mimetype: req.file.mimetype,
            owner: req.user._id
        });

        await file.save();

        res.status(201).json({
            message: 'File uploaded successfully',
            file
        });
    } catch (error) {
        res.status(500).json({ error: 'Error uploading file' });
    }
};

// Get all files for user
exports.getFiles = async (req, res) => {
    try {
        const files = await File.find({
            $or: [
                { owner: req.user._id },
                { sharedWith: req.user._id },
                { isPublic: true }
            ]
        }).sort({ createdAt: -1 });

        res.json(files);
    } catch (error) {
        res.status(500).json({ error: 'Error fetching files' });
    }
};

// Get single file
exports.getFile = async (req, res) => {
    try {
        const file = await File.findById(req.params.id);
        
        if (!file) {
            return res.status(404).json({ error: 'File not found' });
        }

        // Check if user has access to file
        if (!file.isPublic && 
            file.owner.toString() !== req.user._id.toString() && 
            !file.sharedWith.includes(req.user._id)) {
            return res.status(403).json({ error: 'Access denied' });
        }

        res.json(file);
    } catch (error) {
        res.status(500).json({ error: 'Error fetching file' });
    }
};

// Download file
exports.downloadFile = async (req, res) => {
    try {
        const file = await File.findById(req.params.id);
        
        if (!file) {
            return res.status(404).json({ error: 'File not found' });
        }

        // Check if user has access to file
        if (!file.isPublic && 
            file.owner.toString() !== req.user._id.toString() && 
            !file.sharedWith.includes(req.user._id)) {
            return res.status(403).json({ error: 'Access denied' });
        }

        res.download(file.path, file.originalName);
    } catch (error) {
        res.status(500).json({ error: 'Error downloading file' });
    }
};

// Share file
exports.shareFile = async (req, res) => {
    try {
        const { userId } = req.body;
        const file = await File.findById(req.params.id);

        if (!file) {
            return res.status(404).json({ error: 'File not found' });
        }

        if (file.owner.toString() !== req.user._id.toString()) {
            return res.status(403).json({ error: 'Only file owner can share' });
        }

        if (file.sharedWith.includes(userId)) {
            return res.status(400).json({ error: 'File already shared with this user' });
        }

        file.sharedWith.push(userId);
        await file.save();

        res.json({
            message: 'File shared successfully',
            file
        });
    } catch (error) {
        res.status(500).json({ error: 'Error sharing file' });
    }
};

// Delete file
exports.deleteFile = async (req, res) => {
    try {
        const file = await File.findById(req.params.id);

        if (!file) {
            return res.status(404).json({ error: 'File not found' });
        }

        if (file.owner.toString() !== req.user._id.toString()) {
            return res.status(403).json({ error: 'Only file owner can delete' });
        }

        // Delete file from filesystem
        try {
            await fs.unlink(file.path);
        } catch (err) {
            console.error('Error deleting file from filesystem:', err);
            // Continue with database deletion even if file doesn't exist in filesystem
        }
        
        // Delete file document using findByIdAndDelete
        await File.findByIdAndDelete(req.params.id);

        res.json({ message: 'File deleted successfully' });
    } catch (error) {
        console.error('Delete file error:', error);
        res.status(500).json({ error: 'Error deleting file' });
    }
};

// Check upload progress
exports.checkProgress = async (req, res) => {
    try {
        const { taskId } = req.params;
        const progress = await queueService.getProgress(taskId);
        res.json({ progress });
    } catch (error) {
        res.status(500).json({ error: 'Error checking progress' });
    }
};

// Search files
exports.searchFiles = async (req, res) => {
    try {
        const { query } = req.query;
        const files = await File.find({
            $and: [
                {
                    $or: [
                        { originalName: { $regex: query, $options: 'i' } },
                        { filename: { $regex: query, $options: 'i' } }
                    ]
                },
                {
                    $or: [
                        { owner: req.user._id },
                        { sharedWith: req.user._id },
                        { isPublic: true }
                    ]
                }
            ]
        }).sort({ createdAt: -1 });

        res.json(files);
    } catch (error) {
        res.status(500).json({ error: 'Error searching files' });
    }
};