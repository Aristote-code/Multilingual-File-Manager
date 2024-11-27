const mongoose = require('mongoose');
const File = require('../../../models/File');

describe('File Model Unit Tests', () => {
    const mockUserId = new mongoose.Types.ObjectId();
    const mockFileData = {
        filename: 'test-file-123.txt',
        originalName: 'test.txt',
        path: '/uploads/test-file-123.txt',
        size: 1024,
        mimetype: 'text/plain',
        owner: mockUserId
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('File Schema', () => {
        it('should create a file with required fields', () => {
            const file = new File(mockFileData);

            expect(file).toHaveProperty('filename', mockFileData.filename);
            expect(file).toHaveProperty('originalName', mockFileData.originalName);
            expect(file).toHaveProperty('path', mockFileData.path);
            expect(file).toHaveProperty('size', mockFileData.size);
            expect(file).toHaveProperty('mimetype', mockFileData.mimetype);
            expect(file.owner).toEqual(mockUserId);
            expect(file.isPublic).toBe(false);
            expect(file.version).toBe(1);
            expect(file.sharedWith).toEqual([]);
            expect(file.createdAt).toBeInstanceOf(Date);
            expect(file.updatedAt).toBeInstanceOf(Date);
        });

        it('should fail validation without required fields', async () => {
            const invalidFile = new File({});
            let validationError;

            try {
                await invalidFile.validate();
            } catch (error) {
                validationError = error;
            }

            expect(validationError).toBeDefined();
            expect(validationError.errors.filename).toBeDefined();
            expect(validationError.errors.originalName).toBeDefined();
            expect(validationError.errors.path).toBeDefined();
            expect(validationError.errors.size).toBeDefined();
            expect(validationError.errors.mimetype).toBeDefined();
            expect(validationError.errors.owner).toBeDefined();
        });

        it('should set default values correctly', () => {
            const file = new File(mockFileData);

            expect(file.isPublic).toBe(false);
            expect(file.version).toBe(1);
            expect(Array.isArray(file.sharedWith)).toBe(true);
            expect(file.sharedWith).toHaveLength(0);
        });

        it('should accept valid shared users', () => {
            const sharedUserId = new mongoose.Types.ObjectId();
            const file = new File({
                ...mockFileData,
                sharedWith: [sharedUserId]
            });

            expect(file.sharedWith).toHaveLength(1);
            expect(file.sharedWith[0]).toEqual(sharedUserId);
        });
    });

    describe('Required Fields', () => {
        it('should require name field', () => {
            const file = new File({
                path: '/test/path',
                size: 1024,
                type: 'text/plain',
                owner: new mongoose.Types.ObjectId()
            });

            const validationError = file.validateSync();
            expect(validationError.errors.filename).toBeDefined();
        });

        it('should require path field', () => {
            const file = new File({
                filename: 'test.txt',
                size: 1024,
                type: 'text/plain',
                owner: new mongoose.Types.ObjectId()
            });

            const validationError = file.validateSync();
            expect(validationError.errors.path).toBeDefined();
        });
    });

    describe('File Size Validation', () => {
        it('should accept valid file size', () => {
            const file = new File(mockFileData);
            const validationError = file.validateSync();

            expect(validationError).toBeUndefined();
        });

        it('should reject negative file size', () => {
            const file = new File({
                ...mockFileData,
                size: -1
            });
            const validationError = file.validateSync();

            expect(validationError).toBeDefined();
            expect(validationError.errors.size).toBeDefined();
            expect(validationError.errors.size.kind).toBe('min');
        });

        it('should reject non-numeric file size', () => {
            const file = new File({
                ...mockFileData,
                size: 'invalid'
            });
            const validationError = file.validateSync();

            expect(validationError).toBeDefined();
            expect(validationError.errors.size).toBeDefined();
        });
    });

    describe('File Path Validation', () => {
        it('should accept valid file path', () => {
            const file = new File(mockFileData);
            const validationError = file.validateSync();

            expect(validationError).toBeUndefined();
        });

        it('should require path to be a string', () => {
            const file = new File({
                ...mockFileData,
                path: 123
            });
            const validationError = file.validateSync();

            expect(validationError).toBeDefined();
            expect(validationError.errors.path).toBeDefined();
        });
    });

    describe('File References', () => {
        it('should reference User model for owner', () => {
            const file = new File();
            const ownerPath = file.schema.path('owner');

            expect(ownerPath.instance).toBe('ObjectId');
            expect(ownerPath.options.ref).toBe('User');
            expect(ownerPath.options.required).toBe(true);
        });

        it('should reference User model for sharedWith', () => {
            const file = new File();
            const sharedWithPath = file.schema.path('sharedWith');

            expect(sharedWithPath.instance).toBe('Array');
            expect(sharedWithPath.caster.instance).toBe('ObjectId');
            expect(sharedWithPath.caster.options.ref).toBe('User');
        });
    });

    describe('Timestamps', () => {
        it('should set createdAt and updatedAt on creation', () => {
            const file = new File(mockFileData);

            expect(file.createdAt).toBeDefined();
            expect(file.updatedAt).toBeDefined();
            expect(file.createdAt).toBeInstanceOf(Date);
            expect(file.updatedAt).toBeInstanceOf(Date);
        });

        it('should update updatedAt timestamp before saving', async () => {
            const file = new File({
                filename: 'test.txt',
                path: '/test/path',
                size: 1024,
                type: 'text/plain',
                owner: new mongoose.Types.ObjectId()
            });

            const originalUpdatedAt = file.updatedAt;

            // Wait a bit to ensure timestamp difference
            await new Promise(resolve => setTimeout(resolve, 10));

            // Get and execute pre-save hook
            const preSaveHook = file.schema.pre.mock.calls.find(
                call => call[0] === 'save'
            )[1];
            await preSaveHook.call(file);

            expect(file.updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
        });
    });

    describe('Version Control', () => {
        it('should initialize with version 1', () => {
            const file = new File(mockFileData);
            expect(file.version).toBe(1);
        });

        it('should accept valid version numbers', () => {
            const file = new File({
                ...mockFileData,
                version: 2
            });
            const validationError = file.validateSync();

            expect(validationError).toBeUndefined();
            expect(file.version).toBe(2);
        });

        it('should reject non-numeric versions', () => {
            const file = new File({
                ...mockFileData,
                version: 'invalid'
            });
            const validationError = file.validateSync();

            expect(validationError).toBeDefined();
            expect(validationError.errors.version).toBeDefined();
        });
    });
});