const request = require('supertest');
const express = require('express');
const path = require('path');
const fs = require('fs');
const { auth } = require('../../../middlewares/auth');
const upload = require('../../../middlewares/upload');
const fileController = require('../../../controllers/fileController');
const fileRoutes = require('../../../routes/file.routes');

// Mock dependencies
jest.mock('fs');
jest.mock('../../../middlewares/auth');
jest.mock('../../../middlewares/upload');
jest.mock('../../../controllers/fileController');

describe('File Routes Unit Tests', () => {
    let app;
    const mockUser = { id: 'user123' };

    beforeEach(() => {
        jest.clearAllMocks();
        // Create a new Express app for each test
        app = express();
        app.use(express.json());
        app.use('/files', fileRoutes);

        // Mock auth middleware to pass by default and set user
        auth.mockImplementation((req, res, next) => {
            req.user = mockUser;
            next();
        });

        // Mock upload middleware
        upload.single.mockReturnValue((req, res, next) => next());

        // Mock fs functions
        fs.existsSync.mockReturnValue(true);
        fs.mkdirSync.mockReturnValue(undefined);
    });

    describe('Middleware Setup', () => {
        it('should create uploads directory if it does not exist', () => {
            fs.existsSync.mockReturnValue(false);
            require('../../../routes/file.routes');

            expect(fs.mkdirSync).toHaveBeenCalledWith(
                expect.stringContaining('uploads'),
                { recursive: true }
            );
        });

        it('should not create uploads directory if it exists', () => {
            fs.existsSync.mockReturnValue(true);
            require('../../../routes/file.routes');

            expect(fs.mkdirSync).not.toHaveBeenCalled();
        });
    });

    describe('POST /files/upload', () => {
        const mockFile = {
            originalname: 'test.txt',
            buffer: Buffer.from('test content')
        };

        beforeEach(() => {
            fileController.uploadFile.mockImplementation((req, res) => {
                res.status(201).json({ message: 'File uploaded successfully' });
            });
        });

        it('should upload file successfully', async () => {
            const response = await request(app)
                .post('/files/upload')
                .attach('file', Buffer.from('test content'), 'test.txt');

            expect(response.status).toBe(201);
            expect(response.body).toEqual({
                message: 'File uploaded successfully'
            });
            expect(upload.single).toHaveBeenCalledWith('file');
            expect(fileController.uploadFile).toHaveBeenCalled();
        });

        it('should handle upload errors', async () => {
            fileController.uploadFile.mockImplementation((req, res) => {
                res.status(400).json({ message: 'Invalid file' });
            });

            const response = await request(app)
                .post('/files/upload')
                .attach('file', Buffer.from('test content'), 'test.txt');

            expect(response.status).toBe(400);
            expect(response.body).toEqual({
                message: 'Invalid file'
            });
        });
    });

    describe('GET /files', () => {
        beforeEach(() => {
            fileController.getFiles.mockImplementation((req, res) => {
                res.json({ files: [] });
            });
        });

        it('should get files list', async () => {
            const response = await request(app).get('/files');

            expect(response.status).toBe(200);
            expect(response.body).toEqual({ files: [] });
            expect(fileController.getFiles).toHaveBeenCalled();
        });

        it('should handle file list errors', async () => {
            fileController.getFiles.mockImplementation((req, res) => {
                res.status(500).json({ message: 'Error fetching files' });
            });

            const response = await request(app).get('/files');

            expect(response.status).toBe(500);
            expect(response.body).toEqual({
                message: 'Error fetching files'
            });
        });
    });

    describe('GET /files/search', () => {
        beforeEach(() => {
            fileController.searchFiles.mockImplementation((req, res) => {
                res.json({ files: [], total: 0 });
            });
        });

        it('should search files with query parameters', async () => {
            const response = await request(app)
                .get('/files/search')
                .query({ q: 'test', type: 'document' });

            expect(response.status).toBe(200);
            expect(response.body).toEqual({ files: [], total: 0 });
            expect(fileController.searchFiles).toHaveBeenCalled();
        });

        it('should handle search errors', async () => {
            fileController.searchFiles.mockImplementation((req, res) => {
                res.status(500).json({ message: 'Search error' });
            });

            const response = await request(app)
                .get('/files/search')
                .query({ q: 'test' });

            expect(response.status).toBe(500);
            expect(response.body).toEqual({
                message: 'Search error'
            });
        });
    });

    describe('GET /files/progress/:taskId', () => {
        beforeEach(() => {
            fileController.checkProgress.mockImplementation((req, res) => {
                res.json({ progress: 50 });
            });
        });

        it('should get task progress', async () => {
            const response = await request(app)
                .get('/files/progress/task123');

            expect(response.status).toBe(200);
            expect(response.body).toEqual({ progress: 50 });
            expect(fileController.checkProgress).toHaveBeenCalled();
        });

        it('should handle progress check errors', async () => {
            fileController.checkProgress.mockImplementation((req, res) => {
                res.status(404).json({ message: 'Task not found' });
            });

            const response = await request(app)
                .get('/files/progress/invalid');

            expect(response.status).toBe(404);
            expect(response.body).toEqual({
                message: 'Task not found'
            });
        });
    });

    describe('GET /files/:id', () => {
        beforeEach(() => {
            fileController.getFile.mockImplementation((req, res) => {
                res.json({ id: 'file123', name: 'test.txt' });
            });
        });

        it('should get file details', async () => {
            const response = await request(app)
                .get('/files/file123');

            expect(response.status).toBe(200);
            expect(response.body).toEqual({
                id: 'file123',
                name: 'test.txt'
            });
            expect(fileController.getFile).toHaveBeenCalled();
        });

        it('should handle file not found', async () => {
            fileController.getFile.mockImplementation((req, res) => {
                res.status(404).json({ message: 'File not found' });
            });

            const response = await request(app)
                .get('/files/invalid');

            expect(response.status).toBe(404);
            expect(response.body).toEqual({
                message: 'File not found'
            });
        });
    });

    describe('GET /files/:id/download', () => {
        beforeEach(() => {
            fileController.downloadFile.mockImplementation((req, res) => {
                res.download('test.txt');
            });
        });

        it('should download file', async () => {
            const response = await request(app)
                .get('/files/file123/download');

            expect(fileController.downloadFile).toHaveBeenCalled();
        });

        it('should handle download errors', async () => {
            fileController.downloadFile.mockImplementation((req, res) => {
                res.status(404).json({ message: 'File not found' });
            });

            const response = await request(app)
                .get('/files/invalid/download');

            expect(response.status).toBe(404);
            expect(response.body).toEqual({
                message: 'File not found'
            });
        });
    });

    describe('POST /files/:id/share', () => {
        const shareData = {
            userId: 'user456',
            permission: 'read'
        };

        beforeEach(() => {
            fileController.shareFile.mockImplementation((req, res) => {
                res.json({ message: 'File shared successfully' });
            });
        });

        it('should share file with user', async () => {
            const response = await request(app)
                .post('/files/file123/share')
                .send(shareData);

            expect(response.status).toBe(200);
            expect(response.body).toEqual({
                message: 'File shared successfully'
            });
            expect(fileController.shareFile).toHaveBeenCalled();
        });

        it('should handle sharing errors', async () => {
            fileController.shareFile.mockImplementation((req, res) => {
                res.status(400).json({ message: 'Invalid share request' });
            });

            const response = await request(app)
                .post('/files/file123/share')
                .send({});

            expect(response.status).toBe(400);
            expect(response.body).toEqual({
                message: 'Invalid share request'
            });
        });
    });

    describe('DELETE /files/:id', () => {
        beforeEach(() => {
            fileController.deleteFile.mockImplementation((req, res) => {
                res.json({ message: 'File deleted successfully' });
            });
        });

        it('should delete file', async () => {
            const response = await request(app)
                .delete('/files/file123');

            expect(response.status).toBe(200);
            expect(response.body).toEqual({
                message: 'File deleted successfully'
            });
            expect(fileController.deleteFile).toHaveBeenCalled();
        });

        it('should handle deletion errors', async () => {
            fileController.deleteFile.mockImplementation((req, res) => {
                res.status(404).json({ message: 'File not found' });
            });

            const response = await request(app)
                .delete('/files/invalid');

            expect(response.status).toBe(404);
            expect(response.body).toEqual({
                message: 'File not found'
            });
        });
    });

    describe('Authentication', () => {
        it('should reject requests without authentication', async () => {
            auth.mockImplementation((req, res, next) => {
                res.status(401).json({ message: 'Authentication required' });
            });

            const response = await request(app).get('/files');

            expect(response.status).toBe(401);
            expect(response.body).toEqual({
                message: 'Authentication required'
            });
        });
    });
});