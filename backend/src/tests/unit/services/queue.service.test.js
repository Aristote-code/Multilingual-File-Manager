const Redis = require('ioredis-mock');
const queueService = require('../../../services/queueService');

jest.mock('ioredis', () => require('ioredis-mock'));

describe('Queue Service Unit Tests', () => {
    let mockRedisClient;

    beforeEach(() => {
        // Reset all mocks
        jest.clearAllMocks();
        mockRedisClient = new Redis();

        // Mock successful Redis operations by default
        mockRedisClient.lPush.mockImplementation((key, value, cb) => cb(null, 'OK'));
        mockRedisClient.rPop.mockImplementation((key, cb) => cb(null, 'value'));
        mockRedisClient.set.mockImplementation((key, value, cb) => cb(null, 'OK'));
        mockRedisClient.get.mockImplementation((key, cb) => cb(null, '50'));
    });

    describe('addToQueue', () => {
        it('should successfully add task to queue', async () => {
            const queueName = 'test-queue';
            const data = { taskId: '123', type: 'test' };

            const result = await queueService.addToQueue(queueName, data);

            expect(result).toBe(true);
            expect(mockRedisClient.lPush).toHaveBeenCalledWith(
                queueName,
                JSON.stringify(data),
                expect.any(Function)
            );
        });

        it('should handle Redis errors when adding to queue', async () => {
            const error = new Error('Redis error');
            mockRedisClient.lPush.mockImplementation((key, value, cb) => cb(error));

            const result = await queueService.addToQueue('test-queue', {});

            expect(result).toBe(false);
        });

        it('should handle invalid data gracefully', async () => {
            const circularRef = {};
            circularRef.self = circularRef;

            const result = await queueService.addToQueue('test-queue', circularRef);

            expect(result).toBe(false);
        });
    });

    describe('processQueue', () => {
        it('should successfully process task from queue', async () => {
            const mockData = { taskId: '123', type: 'test' };
            mockRedisClient.rPop.mockImplementation((key, cb) => 
                cb(null, JSON.stringify(mockData))
            );

            const result = await queueService.processQueue('test-queue');

            expect(result).toEqual(mockData);
            expect(mockRedisClient.rPop).toHaveBeenCalledWith(
                'test-queue',
                expect.any(Function)
            );
        });

        it('should return null for empty queue', async () => {
            mockRedisClient.rPop.mockImplementation((key, cb) => cb(null, null));

            const result = await queueService.processQueue('test-queue');

            expect(result).toBeNull();
        });

        it('should handle Redis errors when processing queue', async () => {
            const error = new Error('Redis error');
            mockRedisClient.rPop.mockImplementation((key, cb) => cb(error));

            const result = await queueService.processQueue('test-queue');

            expect(result).toBeNull();
        });

        it('should handle invalid JSON data', async () => {
            mockRedisClient.rPop.mockImplementation((key, cb) => 
                cb(null, 'invalid-json')
            );

            const result = await queueService.processQueue('test-queue');

            expect(result).toBeNull();
        });
    });

    describe('setProgress', () => {
        it('should successfully set task progress', async () => {
            const taskId = '123';
            const progress = 50;

            const result = await queueService.setProgress(taskId, progress);

            expect(result).toBe(true);
            expect(mockRedisClient.set).toHaveBeenCalledWith(
                `progress:${taskId}`,
                progress.toString(),
                expect.any(Function)
            );
        });

        it('should handle Redis errors when setting progress', async () => {
            const error = new Error('Redis error');
            mockRedisClient.set.mockImplementation((key, value, cb) => cb(error));

            const result = await queueService.setProgress('123', 50);

            expect(result).toBe(false);
        });

        it('should handle non-numeric progress values', async () => {
            const result = await queueService.setProgress('123', 'invalid');

            expect(result).toBe(true); // Should convert to string anyway
            expect(mockRedisClient.set).toHaveBeenCalledWith(
                'progress:123',
                'invalid',
                expect.any(Function)
            );
        });
    });

    describe('getProgress', () => {
        it('should successfully get task progress', async () => {
            const taskId = '123';
            mockRedisClient.get.mockImplementation((key, cb) => cb(null, '75'));

            const result = await queueService.getProgress(taskId);

            expect(result).toBe(75);
            expect(mockRedisClient.get).toHaveBeenCalledWith(
                `progress:${taskId}`,
                expect.any(Function)
            );
        });

        it('should return 0 for non-existent task', async () => {
            mockRedisClient.get.mockImplementation((key, cb) => cb(null, null));

            const result = await queueService.getProgress('123');

            expect(result).toBe(0);
        });

        it('should handle Redis errors when getting progress', async () => {
            const error = new Error('Redis error');
            mockRedisClient.get.mockImplementation((key, cb) => cb(error));

            const result = await queueService.getProgress('123');

            expect(result).toBe(0);
        });

        it('should handle non-numeric progress values', async () => {
            mockRedisClient.get.mockImplementation((key, cb) => cb(null, 'invalid'));

            const result = await queueService.getProgress('123');

            expect(result).toBe(0); // Should return 0 for invalid numbers
        });
    });

    describe('Redis client events', () => {
        it('should handle Redis connection errors', () => {
            const errorCallback = mockRedisClient.on.mock.calls.find(
                call => call[0] === 'error'
            )[1];

            const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
            const error = new Error('Connection error');

            errorCallback(error);

            expect(consoleSpy).toHaveBeenCalledWith('Redis Client Error', error);
            consoleSpy.mockRestore();
        });

        it('should log successful connections', () => {
            const connectCallback = mockRedisClient.on.mock.calls.find(
                call => call[0] === 'connect'
            )[1];

            const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

            connectCallback();

            expect(consoleSpy).toHaveBeenCalledWith('Redis Client Connected');
            consoleSpy.mockRestore();
        });
    });
});