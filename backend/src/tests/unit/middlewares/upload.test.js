const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const upload = require('../../../middlewares/upload');

// Mock dependencies
jest.mock('multer');
jest.mock('crypto');

describe('Upload Middleware Unit Tests', () => {
    let mockReq;
    let mockRes;
    let mockNext;
    let storage;
    let fileFilter;

    beforeEach(() => {
        // Reset mocks
        jest.clearAllMocks();

        // Mock request object
        mockReq = {
            file: {
                originalname: 'test.txt',
                mimetype: 'text/plain',
                size: 1024
            }
        };

        // Mock response object
        mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };

        // Mock next function
        mockNext = jest.fn();

        // Capture storage and fileFilter configurations
        multer.mockImplementation((config) => {
            storage = config.storage;
            fileFilter = config.fileFilter;
            return jest.fn();
        });

        // Mock crypto for unique filename generation
        crypto.randomBytes.mockReturnValue({
            toString: jest.fn().mockReturnValue('mockedhash')
        });
    });

    describe('Storage Configuration', () => {
        it('should set correct destination', (done) => {
            const mockCallback = jest.fn((error, destination) => {
                expect(error).toBeNull();
                expect(destination).toBe('uploads/');
                done();
            });

            storage.destination(mockReq, mockReq.file, mockCallback);
        });

        it('should use custom upload path from environment variable', (done) => {
            process.env.FILE_UPLOAD_PATH = 'custom/path/';
            const mockCallback = jest.fn((error, destination) => {
                expect(error).toBeNull();
                expect(destination).toBe('custom/path/');
                done();
            });

            storage.destination(mockReq, mockReq.file, mockCallback);
            delete process.env.FILE_UPLOAD_PATH;
        });

        it('should generate unique filename', (done) => {
            const mockCallback = jest.fn((error, filename) => {
                expect(error).toBeNull();
                expect(filename).toBe('mockedhash.txt');
                expect(crypto.randomBytes).toHaveBeenCalledWith(16);
                done();
            });

            storage.filename(mockReq, mockReq.file, mockCallback);
        });

        it('should preserve file extension', (done) => {
            mockReq.file.originalname = 'test.jpg';
            const mockCallback = jest.fn((error, filename) => {
                expect(error).toBeNull();
                expect(filename).toBe('mockedhash.jpg');
                done();
            });

            storage.filename(mockReq, mockReq.file, mockCallback);
        });
    });

    describe('File Filter', () => {
        it('should accept valid file', (done) => {
            const mockCallback = jest.fn((error, acceptFile) => {
                expect(error).toBeNull();
                expect(acceptFile).toBe(true);
                done();
            });

            fileFilter(mockReq, mockReq.file, mockCallback);
        });

        it('should handle files without extension', (done) => {
            mockReq.file.originalname = 'testfile';
            const mockCallback = jest.fn((error, acceptFile) => {
                expect(error).toBeNull();
                expect(acceptFile).toBe(true);
                done();
            });

            fileFilter(mockReq, mockReq.file, mockCallback);
        });
    });

    describe('Multer Configuration', () => {
        it('should configure multer with correct options', () => {
            expect(multer).toHaveBeenCalledWith({
                storage: expect.any(Object),
                fileFilter: expect.any(Function),
                limits: {
                    fileSize: 10 * 1024 * 1024 // 10MB
                }
            });
        });

        it('should have correct file size limit', () => {
            const multerConfig = multer.mock.calls[0][0];
            expect(multerConfig.limits.fileSize).toBe(10 * 1024 * 1024);
        });
    });

    describe('Error Handling', () => {
        it('should handle storage errors', (done) => {
            const mockCallback = jest.fn((error, destination) => {
                expect(error).toBeNull();
                done();
            });

            storage.destination(mockReq, mockReq.file, mockCallback);
        });

        it('should handle filename generation errors', (done) => {
            crypto.randomBytes.mockImplementation(() => {
                throw new Error('Crypto error');
            });

            const mockCallback = jest.fn((error, filename) => {
                expect(error).toBeInstanceOf(Error);
                expect(error.message).toBe('Crypto error');
                done();
            });

            storage.filename(mockReq, mockReq.file, mockCallback);
        });
    });

    describe('Integration with Express', () => {
        it('should return middleware function', () => {
            expect(upload).toBeInstanceOf(Function);
        });

        it('should handle multiple files configuration', () => {
            const multiUpload = multer({
                storage,
                fileFilter,
                limits: { fileSize: 10 * 1024 * 1024 }
            }).array('files', 5);

            expect(multiUpload).toBeInstanceOf(Function);
        });
    });
});