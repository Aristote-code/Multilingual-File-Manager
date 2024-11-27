const multer = require('multer');
const path = require('path');
const { uploadMiddleware } = require('../../../middlewares/upload');

jest.mock('multer');

describe('Upload Middleware Tests', () => {
    let mockStorage;
    let mockMulter;

    beforeEach(() => {
        // Mock storage engine
        mockStorage = {
            destination: jest.fn(),
            filename: jest.fn()
        };

        // Mock multer
        mockMulter = jest.fn(() => ({
            single: jest.fn().mockReturnValue((req, res, next) => next()),
            array: jest.fn().mockReturnValue((req, res, next) => next())
        }));
        mockMulter.diskStorage = jest.fn().mockReturnValue(mockStorage);
        multer.mockImplementation(mockMulter);
    });

    describe('Storage Configuration', () => {
        it('should set correct destination', (done) => {
            const mockReq = {};
            const mockFile = {};
            const expectedPath = path.join(process.env.FILE_UPLOAD_PATH);

            mockStorage.destination.mockImplementation((req, file, cb) => {
                expect(req).toBe(mockReq);
                expect(file).toBe(mockFile);
                cb(null, expectedPath);
                done();
            });

            uploadMiddleware.single('file');
        });

        it('should generate unique filename', (done) => {
            const mockReq = {};
            const mockFile = { originalname: 'test.jpg' };

            mockStorage.filename.mockImplementation((req, file, cb) => {
                expect(req).toBe(mockReq);
                expect(file).toBe(mockFile);
                const filename = cb.mock.calls[0][1];
                expect(filename).toMatch(/^[0-9a-f]{24}\.jpg$/);
                done();
            });

            uploadMiddleware.single('file');
        });
    });
});