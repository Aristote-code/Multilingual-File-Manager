const fs = require('fs').promises;
const path = require('path');
const File = require('../../../models/File');
const fileService = require('../../../services/fileService');

// Mock dependencies
jest.mock('fs').promises;
jest.mock('../../../models/File');

describe('File Service Unit Tests', () => {
    const mockUserId = 'user123';
    const mockFileId = 'file123';
    const mockFile = {
        buffer: Buffer.from('test file content'),
        originalname: 'test.txt',
        mimetype: 'text/plain',
        size: 1024
    };

    beforeEach(() => {
        jest.clearAllMocks();
        process.env.UPLOAD_DIR = 'test-uploads';
        process.env.MAX_FILE_SIZE = '10485760'; // 10MB
    });

    describe('init', () => {
        it('should create upload directory if it does not exist', async () => {
            fs.mkdir.mockResolvedValue(undefined);

            await fileService.init();

            expect(fs.mkdir).toHaveBeenCalledWith('test-uploads', { recursive: true });
        });

        it('should handle directory creation errors', async () => {
            const error = new Error('Permission denied');
            fs.mkdir.mockRejectedValue(error);

            await expect(fileService.init()).rejects.toThrow('Permission denied');
        });
    });

    describe('validateFile', () => {
        it('should validate valid file', async () => {
            const result = await fileService.validateFile(mockFile);
            expect(result).toBe(true);
        });

        it('should reject missing file', async () => {
            await expect(fileService.validateFile(null))
                .rejects.toThrow('No file provided');
        });

        it('should reject oversized file', async () => {
            const largeFile = { ...mockFile, size: 20 * 1024 * 1024 }; // 20MB
            await expect(fileService.validateFile(largeFile))
                .rejects.toThrow('File size exceeds limit');
        });

        it('should reject invalid file type', async () => {
            const invalidFile = { ...mockFile, mimetype: 'application/exe' };
            await expect(fileService.validateFile(invalidFile))
                .rejects.toThrow('File type not allowed');
        });
    });

    describe('generateUniqueFilename', () => {
        it('should generate unique filename with original extension', () => {
            const filename = fileService.generateUniqueFilename('test.txt');
            expect(filename).toMatch(/^\d+-[a-f0-9]{16}\.txt$/);
        });

        it('should handle filenames without extension', () => {
            const filename = fileService.generateUniqueFilename('test');
            expect(filename).toMatch(/^\d+-[a-f0-9]{16}$/);
        });
    });

    describe('saveFile', () => {
        beforeEach(() => {
            File.prototype.save = jest.fn().mockResolvedValue(true);
        });

        it('should save file successfully', async () => {
            fs.writeFile.mockResolvedValue(undefined);
            const savedFile = await fileService.saveFile(mockFile, mockUserId);

            expect(fs.writeFile).toHaveBeenCalled();
            expect(savedFile).toBeDefined();
            expect(savedFile.owner).toBe(mockUserId);
        });

        it('should cleanup file on database error', async () => {
            fs.writeFile.mockResolvedValue(undefined);
            File.prototype.save.mockRejectedValue(new Error('Database error'));
            fs.unlink.mockResolvedValue(undefined);

            await expect(fileService.saveFile(mockFile, mockUserId))
                .rejects.toThrow('Database error');
            expect(fs.unlink).toHaveBeenCalled();
        });
    });

    describe('deleteFile', () => {
        it('should delete file successfully', async () => {
            const mockFileDoc = {
                path: '/test/path',
                remove: jest.fn().mockResolvedValue(true)
            };
            File.findOne.mockResolvedValue(mockFileDoc);
            fs.unlink.mockResolvedValue(undefined);

            const result = await fileService.deleteFile(mockFileId, mockUserId);

            expect(result).toBe(true);
            expect(fs.unlink).toHaveBeenCalledWith('/test/path');
            expect(mockFileDoc.remove).toHaveBeenCalled();
        });

        it('should handle non-existent file', async () => {
            File.findOne.mockResolvedValue(null);

            await expect(fileService.deleteFile(mockFileId, mockUserId))
                .rejects.toThrow('File not found or access denied');
        });
    });

    describe('getFileStream', () => {
        it('should return file stream for owner', async () => {
            const mockFileDoc = { path: '/test/path', owner: mockUserId };
            File.findOne.mockResolvedValue(mockFileDoc);
            fs.readFile.mockResolvedValue(Buffer.from('file content'));

            const result = await fileService.getFileStream(mockFileId, mockUserId);

            expect(result).toBeDefined();
            expect(fs.readFile).toHaveBeenCalledWith('/test/path');
        });

        it('should return file stream for shared user', async () => {
            const mockFileDoc = {
                path: '/test/path',
                owner: 'other-user',
                sharedWith: [mockUserId]
            };
            File.findOne.mockResolvedValue(mockFileDoc);
            fs.readFile.mockResolvedValue(Buffer.from('file content'));

            const result = await fileService.getFileStream(mockFileId, mockUserId);

            expect(result).toBeDefined();
        });

        it('should handle unauthorized access', async () => {
            File.findOne.mockResolvedValue(null);

            await expect(fileService.getFileStream(mockFileId, mockUserId))
                .rejects.toThrow('File not found or access denied');
        });
    });

    describe('shareFile', () => {
        const targetUserId = 'target123';

        it('should share file with user', async () => {
            const mockFileDoc = {
                owner: mockUserId,
                sharedWith: [],
                save: jest.fn().mockResolvedValue(true)
            };
            File.findOne.mockResolvedValue(mockFileDoc);

            const result = await fileService.shareFile(mockFileId, mockUserId, targetUserId, 'read');

            expect(result.sharedWith).toContain(targetUserId);
        });

        it('should remove share access', async () => {
            const mockFileDoc = {
                owner: mockUserId,
                sharedWith: [targetUserId],
                save: jest.fn().mockResolvedValue(true)
            };
            File.findOne.mockResolvedValue(mockFileDoc);

            const result = await fileService.shareFile(mockFileId, mockUserId, targetUserId, 'none');

            expect(result.sharedWith).not.toContain(targetUserId);
        });
    });

    describe('searchFiles', () => {
        it('should search files with pagination', async () => {
            const mockFiles = [{ id: 1 }, { id: 2 }];
            File.find.mockReturnValue({
                sort: jest.fn().mockReturnThis(),
                skip: jest.fn().mockReturnThis(),
                limit: jest.fn().mockResolvedValue(mockFiles)
            });
            File.countDocuments.mockResolvedValue(10);

            const result = await fileService.searchFiles(mockUserId, 'test', {
                page: 1,
                limit: 2
            });

            expect(result.files).toEqual(mockFiles);
            expect(result.pagination).toEqual({
                total: 10,
                page: 1,
                pages: 5
            });
        });

        it('should apply file type filter', async () => {
            File.find.mockReturnValue({
                sort: jest.fn().mockReturnThis(),
                skip: jest.fn().mockReturnThis(),
                limit: jest.fn().mockResolvedValue([])
            });
            File.countDocuments.mockResolvedValue(0);

            await fileService.searchFiles(mockUserId, '', { type: 'text/plain' });

            expect(File.find).toHaveBeenCalledWith(expect.objectContaining({
                mimetype: 'text/plain'
            }));
        });
    });
});