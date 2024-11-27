const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const File = require('../models/File');
const queueService = require('./queueService');

class FileService {
    constructor() {
        this.uploadDir = process.env.UPLOAD_DIR || 'uploads';
        this.maxFileSize = process.env.MAX_FILE_SIZE || 10 * 1024 * 1024; // 10MB
        this.allowedTypes = new Set(['image/jpeg', 'image/png', 'application/pdf', 'text/plain']);
    }

    async init() {
        try {
            await fs.mkdir(this.uploadDir, { recursive: true });
        } catch (error) {
            console.error('Error creating upload directory:', error);
            throw error;
        }
    }

    async validateFile(file) {
        if (!file) {
            throw new Error('No file provided');
        }

        if (file.size > this.maxFileSize) {
            throw new Error('File size exceeds limit');
        }

        if (!this.allowedTypes.has(file.mimetype)) {
            throw new Error('File type not allowed');
        }

        return true;
    }

    generateUniqueFilename(originalname) {
        const timestamp = Date.now();
        const random = crypto.randomBytes(8).toString('hex');
        const ext = path.extname(originalname);
        return `${timestamp}-${random}${ext}`;
    }

    async saveFile(file, userId) {
        await this.validateFile(file);

        const filename = this.generateUniqueFilename(file.originalname);
        const filepath = path.join(this.uploadDir, filename);

        try {
            await fs.writeFile(filepath, file.buffer);

            const fileDoc = new File({
                filename,
                originalName: file.originalname,
                path: filepath,
                size: file.size,
                mimetype: file.mimetype,
                owner: userId
            });

            await fileDoc.save();
            return fileDoc;
        } catch (error) {
            // Cleanup if file was written but database save failed
            try {
                await fs.unlink(filepath);
            } catch (unlinkError) {
                console.error('Error cleaning up file:', unlinkError);
            }
            throw error;
        }
    }

    async deleteFile(fileId, userId) {
        const file = await File.findOne({ _id: fileId, owner: userId });
        if (!file) {
            throw new Error('File not found or access denied');
        }

        try {
            await fs.unlink(file.path);
            await file.remove();
            return true;
        } catch (error) {
            console.error('Error deleting file:', error);
            throw error;
        }
    }

    async getFileStream(fileId, userId) {
        const file = await File.findOne({
            _id: fileId,
            $or: [
                { owner: userId },
                { sharedWith: userId },
                { isPublic: true }
            ]
        });

        if (!file) {
            throw new Error('File not found or access denied');
        }

        return fs.readFile(file.path);
    }

    async shareFile(fileId, userId, targetUserId, permission) {
        const file = await File.findOne({ _id: fileId, owner: userId });
        if (!file) {
            throw new Error('File not found or access denied');
        }

        if (permission === 'none') {
            file.sharedWith = file.sharedWith.filter(id => id.toString() !== targetUserId);
        } else {
            if (!file.sharedWith.includes(targetUserId)) {
                file.sharedWith.push(targetUserId);
            }
        }

        await file.save();
        return file;
    }

    async searchFiles(userId, query = '', options = {}) {
        const { type, sort = 'createdAt', order = 'desc', page = 1, limit = 10 } = options;

        const searchQuery = {
            $or: [
                { owner: userId },
                { sharedWith: userId },
                { isPublic: true }
            ]
        };

        if (query) {
            searchQuery.$and = [
                {
                    $or: [
                        { filename: { $regex: query, $options: 'i' } },
                        { originalName: { $regex: query, $options: 'i' } }
                    ]
                }
            ];
        }

        if (type) {
            searchQuery.mimetype = type;
        }

        const sortOptions = { [sort]: order === 'desc' ? -1 : 1 };
        const skip = (page - 1) * limit;

        const [files, total] = await Promise.all([
            File.find(searchQuery)
                .sort(sortOptions)
                .skip(skip)
                .limit(limit),
            File.countDocuments(searchQuery)
        ]);

        return {
            files,
            pagination: {
                total,
                page,
                pages: Math.ceil(total / limit)
            }
        };
    }
}

module.exports = new FileService();