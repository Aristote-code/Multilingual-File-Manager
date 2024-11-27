const Redis = require('ioredis-mock');
const { createClient } = require('../../../config/redis');

jest.mock('ioredis', () => require('ioredis-mock'));

describe('Redis Configuration Unit Tests', () => {
    let mockRedisClient;
    let consoleSpy;

    beforeEach(() => {
        jest.clearAllMocks();
        consoleSpy = jest.spyOn(console, 'log').mockImplementation();
        jest.spyOn(console, 'error').mockImplementation();
    });

    afterEach(() => {
        consoleSpy.mockRestore();
    });

    describe('Redis Client Configuration', () => {
        it('should create Redis client with default URL', () => {
            process.env.REDIS_URL = undefined;
            const client = createClient();
            
            expect(client).toBeInstanceOf(Redis);
            expect(client.options.host).toBe('localhost');
            expect(client.options.port).toBe(6379);
        });

        it('should create Redis client with custom URL', () => {
            process.env.REDIS_URL = 'redis://custom:6380';
            const client = createClient();
            
            expect(client).toBeInstanceOf(Redis);
            expect(client.options.host).toBe('custom');
            expect(client.options.port).toBe(6380);
        });

        it('should use correct connection options', () => {
            const client = createClient();
            
            expect(client.options.retryStrategy).toBeDefined();
            expect(client.options.maxRetriesPerRequest).toBeDefined();
        });
    });

    describe('Event Handling', () => {
        it('should handle successful connection', () => {
            const client = createClient();
            client.emit('connect');
            
            expect(console.log).toHaveBeenCalledWith('Redis client connected');
        });

        it('should handle connection errors', () => {
            const client = createClient();
            const error = new Error('Connection failed');
            client.emit('error', error);
            
            expect(console.error).toHaveBeenCalledWith('Redis client error:', error);
        });

        it('should handle multiple error events', () => {
            const client = createClient();
            const error1 = new Error('Error 1');
            const error2 = new Error('Error 2');
            
            client.emit('error', error1);
            client.emit('error', error2);
            
            expect(console.error).toHaveBeenCalledWith('Redis client error:', error1);
            expect(console.error).toHaveBeenCalledWith('Redis client error:', error2);
        });
    });

    describe('Error Scenarios', () => {
        it('should handle authentication errors', () => {
            const client = createClient();
            const error = new Error('Authentication failed');
            client.emit('error', error);
            
            expect(console.error).toHaveBeenCalledWith('Redis client error:', error);
        });

        it('should handle network errors', () => {
            const client = createClient();
            const error = new Error('Network unreachable');
            client.emit('error', error);
            
            expect(console.error).toHaveBeenCalledWith('Redis client error:', error);
        });

        it('should handle timeout errors', () => {
            const client = createClient();
            const error = new Error('Connection timeout');
            client.emit('error', error);
            
            expect(console.error).toHaveBeenCalledWith('Redis client error:', error);
        });
    });

    describe('Client Export', () => {
        it('should export Redis client instance', () => {
            const client = createClient();
            expect(client).toBeDefined();
            expect(client).toBeInstanceOf(Redis);
        });

        it('should maintain singleton instance', () => {
            const client1 = createClient();
            const client2 = createClient();
            expect(client1).toBe(client2);
        });
    });
});