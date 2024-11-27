const FileWorker = require('../../../workers/file.worker');
const QueueService = require('../../../services/queue.service');
const fs = require('fs/promises');
const path = require('path');

jest.mock('../../../services/queue.service');
jest.mock('fs/promises');

describe('File Worker Unit Tests', () => {
    let fileWorker;
    let mockQueueService;

    beforeEach(() => {
        mockQueueService = new QueueService();
        fileWorker = new FileWorker(mockQueueService);
        jest.clearAllMocks();
    });

    describe('processFile', () => {
        it('should process file successfully', async () => {
            const taskId = '123';
            const fileData = {
                originalname: 'test.txt',
                buffer: Buffer.from('test content'),
                mimetype: 'text/plain',
                size: 100
            };

            fs.mkdir.mockResolvedValue(undefined);
            fs.writeFile.mockResolvedValue(undefined);
            mockQueueService.updateProgress.mockResolvedValue();

            await fileWorker.processFile(taskId, fileData);

            expect(fs.mkdir).toHaveBeenCalled();
            expect(fs.writeFile).toHaveBeenCalled();
            expect(mockQueueService.updateProgress).toHaveBeenCalledWith(taskId, 100);
        });

        it('should handle missing file data', async () => {
            const taskId = '123';
            
            await expect(fileWorker.processFile(taskId, null))
                .rejects.toThrow('Invalid file data');
            
            expect(mockQueueService.updateProgress).not.toHaveBeenCalled();
        });

        it('should handle directory creation error', async () => {
            const taskId = '123';
            const fileData = {
                originalname: 'test.txt',
                buffer: Buffer.from('test content'),
                mimetype: 'text/plain',
                size: 100
            };

            const error = new Error('Directory creation failed');
            fs.mkdir.mockRejectedValue(error);

            await expect(fileWorker.processFile(taskId, fileData))
                .rejects.toThrow('Directory creation failed');
            
            expect(mockQueueService.updateProgress).not.toHaveBeenCalled();
        });

        it('should handle file write error', async () => {
            const taskId = '123';
            const fileData = {
                originalname: 'test.txt',
                buffer: Buffer.from('test content'),
                mimetype: 'text/plain',
                size: 100
            };

            fs.mkdir.mockResolvedValue(undefined);
            const error = new Error('File write failed');
            fs.writeFile.mockRejectedValue(error);

            await expect(fileWorker.processFile(taskId, fileData))
                .rejects.toThrow('File write failed');
            
            expect(mockQueueService.updateProgress).not.toHaveBeenCalled();
        });
    });

    describe('calculateProgress', () => {
        it('should calculate correct progress percentage', () => {
            const written = 50;
            const total = 100;

            const progress = fileWorker.calculateProgress(written, total);
            expect(progress).toBe(50);
        });

        it('should handle zero total size', () => {
            const written = 50;
            const total = 0;

            const progress = fileWorker.calculateProgress(written, total);
            expect(progress).toBe(0);
        });

        it('should handle written larger than total', () => {
            const written = 150;
            const total = 100;

            const progress = fileWorker.calculateProgress(written, total);
            expect(progress).toBe(100);
        });
    });

    describe('cleanup', () => {
        it('should remove task from queue', async () => {
            const taskId = '123';
            mockQueueService.removeTask.mockResolvedValue();

            await fileWorker.cleanup(taskId);

            expect(mockQueueService.removeTask).toHaveBeenCalledWith(taskId);
        });

        it('should handle cleanup errors', async () => {
            const taskId = '123';
            const error = new Error('Cleanup failed');
            mockQueueService.removeTask.mockRejectedValue(error);

            await expect(fileWorker.cleanup(taskId))
                .rejects.toThrow('Cleanup failed');
        });
    });
});