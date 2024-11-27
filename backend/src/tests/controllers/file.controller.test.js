const fileController = require('../../controllers/fileController');
const File = require('../../models/File');
const queueService = require('../../services/queueService');
const crypto = require('crypto');

// Mock dependencies
jest.mock('../../models/File');
jest.mock('../../services/queueService');
jest.mock('crypto');

describe('File Controller Unit Tests', () => {
    let mockReq;
    let mockRes;
    const mockUserId = 'user123';
    const mockFileId = 'file123';

    beforeEach(() => {
        // Reset all mocks
        jest.clearAllMocks();

        // Mock request object
        mockReq = {
            user: { _id: mockUserId },
            file: {
                filename: 'test.txt',
                originalname: 'test.txt',
                path: '/path/to/file',
                size: 1024,
                mimetype: 'text/plain'
            },
            params: { id: mockFileId }
        };

        // Mock response object
        mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };
    });

    describe('uploadFile', () => {
        it('should process small files immediately', async () => {
            const mockFile = { _id: 'file123', save: jest.fn() };
            File.mockImplementation(() => mockFile);

            await fileController.uploadFile(mockReq, mockRes);

            expect(File).toHaveBeenCalledWith({
                filename: mockReq.file.filename,
                originalName: mockReq.file.originalname,
                path: mockReq.file.path,
                size: mockReq.file.size,
                mimetype: mockReq.file.mimetype,
                owner: mockUserId
            });
            expect(mockFile.save).toHaveBeenCalled();
            expect(mockRes.status).toHaveBeenCalledWith(201);
            expect(mockRes.json).toHaveBeenCalledWith({
                message: 'File uploaded successfully',
                file: mockFile
            });
        });

        it('should queue large files for processing', async () => {
            mockReq.file.size = 10 * 1024 * 1024; // 10MB
            const mockTaskId = 'task123';
            crypto.randomBytes.mockReturnValue({ toString: () => mockTaskId });

            await fileController.uploadFile(mockReq, mockRes);

            expect(queueService.addToQueue).toHaveBeenCalledWith('file-processing', {
                originalPath: mockReq.file.path,
                userId: mockUserId,
                originalName: mockReq.file.originalname,
                mimetype: mockReq.file.mimetype,
                size: mockReq.file.size,
                taskId: mockTaskId
            });
            expect(mockRes.status).toHaveBeenCalledWith(202);
            expect(mockRes.json).toHaveBeenCalledWith({
                message: 'File queued for processing',
                taskId: mockTaskId
            });
        });

        it('should handle missing file', async () => {
            mockReq.file = null;

            await fileController.uploadFile(mockReq, mockRes);

            expect(mockRes.status).toHaveBeenCalledWith(400);
            expect(mockRes.json).toHaveBeenCalledWith({ error: 'No file uploaded' });
        });

        it('should handle errors', async () => {
            const mockFile = { save: jest.fn().mockRejectedValue(new Error('DB Error')) };
            File.mockImplementation(() => mockFile);

            await fileController.uploadFile(mockReq, mockRes);

            expect(mockRes.status).toHaveBeenCalledWith(500);
            expect(mockRes.json).toHaveBeenCalledWith({ error: 'Error uploading file' });
        });
    });

    describe('getFiles', () => {
        it('should return user accessible files', async () => {
            const mockFiles = [{ id: 'file1' }, { id: 'file2' }];
            File.find.mockReturnValue({
                sort: jest.fn().mockResolvedValue(mockFiles)
            });

            await fileController.getFiles(mockReq, mockRes);

            expect(File.find).toHaveBeenCalledWith({
                $or: [
                    { owner: mockUserId },
                    { sharedWith: mockUserId },
                    { isPublic: true }
                ]
            });
            expect(mockRes.json).toHaveBeenCalledWith(mockFiles);
        });

        it('should handle errors', async () => {
            File.find.mockReturnValue({
                sort: jest.fn().mockRejectedValue(new Error('DB Error'))
            });

            await fileController.getFiles(mockReq, mockRes);

            expect(mockRes.status).toHaveBeenCalledWith(500);
            expect(mockRes.json).toHaveBeenCalledWith({ error: 'Error fetching files' });
        });
    });

    describe('getFile', () => {
        it('should return file if user has access', async () => {
            const mockFile = {
                _id: mockFileId,
                owner: mockUserId,
                isPublic: false,
                sharedWith: []
            };
            File.findById.mockResolvedValue(mockFile);

            await fileController.getFile(mockReq, mockRes);

            expect(File.findById).toHaveBeenCalledWith(mockFileId);
            expect(mockRes.json).toHaveBeenCalledWith(mockFile);
        });

        it('should return 404 for non-existent file', async () => {
            File.findById.mockResolvedValue(null);

            await fileController.getFile(mockReq, mockRes);

            expect(mockRes.status).toHaveBeenCalledWith(404);
            expect(mockRes.json).toHaveBeenCalledWith({ error: 'File not found' });
        });

        it('should return 403 if user lacks access', async () => {
            const mockFile = {
                _id: mockFileId,
                owner: 'otherUser',
                isPublic: false,
                sharedWith: []
            };
            File.findById.mockResolvedValue(mockFile);

            await fileController.getFile(mockReq, mockRes);

            expect(mockRes.status).toHaveBeenCalledWith(403);
            expect(mockRes.json).toHaveBeenCalledWith({ error: 'Access denied' });
        });
    });

    describe('shareFile', () => {
        beforeEach(() => {
            mockReq.body = {
                userId: 'user456',
                permission: 'read'
            };
        });

        it('should share file with another user', async () => {
            const mockFile = {
                _id: mockFileId,
                owner: mockUserId,
                sharedWith: [],
                save: jest.fn()
            };
            File.findById.mockResolvedValue(mockFile);

            await fileController.shareFile(mockReq, mockRes);

            expect(mockFile.sharedWith).toContain(mockReq.body.userId);
            expect(mockFile.save).toHaveBeenCalled();
            expect(mockRes.json).toHaveBeenCalledWith(mockFile);
        });

        it('should return 404 for non-existent file', async () => {
            File.findById.mockResolvedValue(null);

            await fileController.shareFile(mockReq, mockRes);

            expect(mockRes.status).toHaveBeenCalledWith(404);
            expect(mockRes.json).toHaveBeenCalledWith({ error: 'File not found' });
        });

        it('should return 403 if user is not owner', async () => {
            const mockFile = {
                _id: mockFileId,
                owner: 'otherUser'
            };
            File.findById.mockResolvedValue(mockFile);

            await fileController.shareFile(mockReq, mockRes);

            expect(mockRes.status).toHaveBeenCalledWith(403);
            expect(mockRes.json).toHaveBeenCalledWith({ error: 'Access denied' });
        });
    });

    describe('deleteFile', () => {
        it('should delete file if user is owner', async () => {
            const mockFile = {
                _id: mockFileId,
                owner: mockUserId,
                path: '/path/to/file',
                remove: jest.fn()
            };
            File.findById.mockResolvedValue(mockFile);

            await fileController.deleteFile(mockReq, mockRes);

            expect(mockFile.remove).toHaveBeenCalled();
            expect(mockRes.status).toHaveBeenCalledWith(204);
            expect(mockRes.json).toHaveBeenCalledWith();
        });

        it('should return 404 for non-existent file', async () => {
            File.findById.mockResolvedValue(null);

            await fileController.deleteFile(mockReq, mockRes);

            expect(mockRes.status).toHaveBeenCalledWith(404);
            expect(mockRes.json).toHaveBeenCalledWith({ error: 'File not found' });
        });

        it('should return 403 if user is not owner', async () => {
            const mockFile = {
                _id: mockFileId,
                owner: 'otherUser'
            };
            File.findById.mockResolvedValue(mockFile);

            await fileController.deleteFile(mockReq, mockRes);

            expect(mockRes.status).toHaveBeenCalledWith(403);
            expect(mockRes.json).toHaveBeenCalledWith({ error: 'Access denied' });
        });
    });

    describe('checkProgress', () => {
        it('should return upload progress', async () => {
            const mockProgress = { status: 'processing', progress: 50 };
            queueService.getProgress.mockResolvedValue(mockProgress);
            mockReq.params.taskId = 'task123';

            await fileController.checkProgress(mockReq, mockRes);

            expect(queueService.getProgress).toHaveBeenCalledWith(mockReq.params.taskId);
            expect(mockRes.json).toHaveBeenCalledWith(mockProgress);
        });

        it('should handle errors', async () => {
            queueService.getProgress.mockRejectedValue(new Error('Queue Error'));
            mockReq.params.taskId = 'task123';

            await fileController.checkProgress(mockReq, mockRes);

            expect(mockRes.status).toHaveBeenCalledWith(500);
            expect(mockRes.json).toHaveBeenCalledWith({ error: 'Error checking progress' });
        });
    });

    describe('searchFiles', () => {
        it('should search files with query', async () => {
            const mockFiles = [{ id: 'file1' }, { id: 'file2' }];
            File.find.mockReturnValue({
                sort: jest.fn().mockResolvedValue(mockFiles)
            });
            mockReq.query = { q: 'test' };

            await fileController.searchFiles(mockReq, mockRes);

            expect(File.find).toHaveBeenCalled();
            expect(mockRes.json).toHaveBeenCalledWith(mockFiles);
        });

        it('should handle errors', async () => {
            File.find.mockReturnValue({
                sort: jest.fn().mockRejectedValue(new Error('DB Error'))
            });
            mockReq.query = { q: 'test' };

            await fileController.searchFiles(mockReq, mockRes);

            expect(mockRes.status).toHaveBeenCalledWith(500);
            expect(mockRes.json).toHaveBeenCalledWith({ error: 'Error searching files' });
        });
    });
});