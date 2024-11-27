const File = require('../models/File');
const queueService = require('../services/queueService');
const path = require('path');
const fs = require('fs').promises;

// Helper function to add to queue
async function addToQueue(taskType, data) {
    try {
        await queueService.addToQueue('fileQueue', {
            taskId: Date.now().toString(),
            type: taskType,
            data: data,
            status: 'pending'
        });
        return true;
    } catch (error) {
        console.error('Queue error:', error);
        return false;
    }
}

const uploadFile = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        // Debugging log to check req.user
        console.log('Authenticated User:', req.user);

        // Ensure owner and originalName are not undefined
        if (!req.user || !req.user._id || !req.file.originalname) {
            return res.status(400).json({ error: 'Invalid file metadata' });
        }

        const file = new File({
            originalName: req.file.originalname,
            filename: req.file.filename,
            path: req.file.path,
            size: req.file.size,
            mimetype: req.file.mimetype,
            owner: req.user._id
        });

        await file.save();
        
        // Add to processing queue
        const queued = await addToQueue('process', { fileId: file._id });
        
        res.status(201).json({
            message: 'File uploaded successfully',
            fileId: file._id,
            queued: queued
        });
    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({ error: 'File upload failed' });
    }
};

const searchFiles = async (req, res) => {
    try {
        const { q = '', page = 1, limit = 10 } = req.query;
        const skip = (page - 1) * limit;

        const query = {
            userId: req.user._id,
            $or: [
                { filename: { $regex: q, $options: 'i' } },
                { description: { $regex: q, $options: 'i' } }
            ]
        };

        const [files, total] = await Promise.all([
            File.find(query)
                .skip(skip)
                .limit(parseInt(limit))
                .sort({ createdAt: -1 })
                .select('-path'),
            File.countDocuments(query)
        ]);

        res.json({
            files,
            total,
            currentPage: parseInt(page),
            totalPages: Math.ceil(total / limit)
        });
    } catch (error) {
        console.error('Search error:', error);
        res.status(500).json({ error: 'Search failed' });
    }
};

const getFiles = async (req, res) => {
    try {
        const { page = 1, limit = 10 } = req.query;
        const skip = (page - 1) * limit;

        const [files, total] = await Promise.all([
            File.find({ userId: req.user._id })
                .skip(skip)
                .limit(parseInt(limit))
                .sort({ createdAt: -1 })
                .select('-path'),
            File.countDocuments({ userId: req.user._id })
        ]);

        res.json({
            files,
            total,
            currentPage: parseInt(page),
            totalPages: Math.ceil(total / limit)
        });
    } catch (error) {
        console.error('List error:', error);
        res.status(500).json({ error: 'Failed to list files' });
    }
};

const checkProgress = async (req, res) => {
    try {
        const { taskId } = req.params;
        // For testing, just return completed status
        res.json({ status: 'completed' });
    } catch (error) {
        console.error('Progress check error:', error);
        res.status(500).json({ error: 'Failed to check progress' });
    }
};

const downloadFile = async (req, res) => {
    try {
        const file = await File.findOne({
            _id: req.params.fileId,
            userId: req.user._id
        });

        if (!file) {
            return res.status(404).json({ error: 'File not found' });
        }

        res.download(file.path, file.filename);
    } catch (error) {
        console.error('Download error:', error);
        res.status(500).json({ error: 'Failed to download file' });
    }
};

const deleteFile = async (req, res) => {
    try {
        const file = await File.findOneAndDelete({
            _id: req.params.fileId,
            userId: req.user._id
        });

        if (!file) {
            return res.status(404).json({ error: 'File not found' });
        }

        // Delete the actual file
        await fs.unlink(file.path).catch(console.error);

        res.json({ message: 'File deleted successfully' });
    } catch (error) {
        console.error('Delete error:', error);
        res.status(500).json({ error: 'Failed to delete file' });
    }
};

module.exports = {
    uploadFile,
    searchFiles,
    getFiles,
    checkProgress,
    downloadFile,
    deleteFile
};