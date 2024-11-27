const logger = require('../../../utils/logger');

describe('Logger Unit Tests', () => {
    let consoleSpy;
    const originalEnv = process.env.NODE_ENV;

    beforeEach(() => {
        consoleSpy = {
            log: jest.spyOn(console, 'log').mockImplementation(),
            error: jest.spyOn(console, 'error').mockImplementation(),
            warn: jest.spyOn(console, 'warn').mockImplementation(),
            info: jest.spyOn(console, 'info').mockImplementation(),
            debug: jest.spyOn(console, 'debug').mockImplementation()
        };
    });

    afterEach(() => {
        process.env.NODE_ENV = originalEnv;
        jest.clearAllMocks();
        Object.values(consoleSpy).forEach(spy => spy.mockRestore());
    });

    describe('info', () => {
        it('should log info messages', () => {
            const message = 'Test info message';
            logger.info(message);
            expect(consoleSpy.info).toHaveBeenCalledWith(
                expect.stringContaining('[INFO]'),
                message
            );
        });

        it('should include timestamp', () => {
            logger.info('Test message');
            expect(consoleSpy.info).toHaveBeenCalledWith(
                expect.stringMatching(/\[\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\]/),
                expect.any(String)
            );
        });
    });

    describe('error', () => {
        it('should log error messages', () => {
            const error = new Error('Test error');
            logger.error(error);
            expect(consoleSpy.error).toHaveBeenCalledWith(
                expect.stringContaining('[ERROR]'),
                error
            );
        });

        it('should handle error objects with stack traces', () => {
            const error = new Error('Test error');
            logger.error(error);
            expect(consoleSpy.error).toHaveBeenCalledWith(
                expect.any(String),
                expect.objectContaining({
                    message: 'Test error',
                    stack: expect.any(String)
                })
            );
        });
    });

    describe('warn', () => {
        it('should log warning messages', () => {
            const message = 'Test warning';
            logger.warn(message);
            expect(consoleSpy.warn).toHaveBeenCalledWith(
                expect.stringContaining('[WARN]'),
                message
            );
        });
    });

    describe('debug', () => {
        it('should log debug messages in development', () => {
            process.env.NODE_ENV = 'development';
            const message = 'Test debug message';
            logger.debug(message);
            expect(consoleSpy.debug).toHaveBeenCalledWith(
                expect.stringContaining('[DEBUG]'),
                message
            );
        });

        it('should not log debug messages in production', () => {
            process.env.NODE_ENV = 'production';
            logger.debug('Test debug message');
            expect(consoleSpy.debug).not.toHaveBeenCalled();
        });
    });

    describe('Format handling', () => {
        it('should handle objects', () => {
            const obj = { key: 'value' };
            logger.info(obj);
            expect(consoleSpy.info).toHaveBeenCalledWith(
                expect.any(String),
                obj
            );
        });

        it('should handle arrays', () => {
            const arr = [1, 2, 3];
            logger.info(arr);
            expect(consoleSpy.info).toHaveBeenCalledWith(
                expect.any(String),
                arr
            );
        });

        it('should handle multiple arguments', () => {
            logger.info('Message', { data: 'test' }, [1, 2, 3]);
            expect(consoleSpy.info).toHaveBeenCalledWith(
                expect.any(String),
                'Message',
                { data: 'test' },
                [1, 2, 3]
            );
        });
    });

    describe('Environment specific behavior', () => {
        it('should include stack traces in development', () => {
            process.env.NODE_ENV = 'development';
            const error = new Error('Test error');
            logger.error(error);
            expect(consoleSpy.error).toHaveBeenCalledWith(
                expect.any(String),
                expect.objectContaining({
                    stack: expect.any(String)
                })
            );
        });

        it('should exclude sensitive information in production', () => {
            process.env.NODE_ENV = 'production';
            const error = new Error('Test error');
            error.sensitiveData = 'secret';
            logger.error(error);
            expect(consoleSpy.error).toHaveBeenCalledWith(
                expect.any(String),
                expect.not.objectContaining({
                    sensitiveData: 'secret'
                })
            );
        });
    });
});