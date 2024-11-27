const mongoose = require('mongoose');
const { connectDB } = require('../../../config/database');

jest.mock('mongoose');

describe('Database Configuration Unit Tests', () => {
    let mockConsole;
    let mockExit;
    let originalEnv;

    beforeEach(() => {
        originalEnv = process.env;
        process.env = { ...originalEnv };
        process.env.MONGODB_URI = 'mongodb://localhost:27017/test';

        mockConsole = {
            log: jest.spyOn(console, 'log').mockImplementation(),
            error: jest.spyOn(console, 'error').mockImplementation()
        };

        mockExit = jest.spyOn(process, 'exit').mockImplementation();

        mongoose.connect.mockReset();
        mongoose.connection = {
            on: jest.fn(),
            once: jest.fn()
        };
    });

    afterEach(() => {
        process.env = originalEnv;
        jest.clearAllMocks();
        mockConsole.log.mockRestore();
        mockConsole.error.mockRestore();
        mockExit.mockRestore();
    });

    describe('Database Connection', () => {
        it('should connect successfully', async () => {
            mongoose.connect.mockResolvedValue(undefined);

            await connectDB();

            expect(mongoose.connect).toHaveBeenCalledWith(process.env.MONGODB_URI, {
                useNewUrlParser: true,
                useUnifiedTopology: true
            });
            expect(mockConsole.log).toHaveBeenCalledWith('MongoDB connected successfully');
        });

        it('should handle connection errors', async () => {
            const error = new Error('Connection failed');
            mongoose.connect.mockRejectedValue(error);

            await connectDB();

            expect(mongoose.connect).toHaveBeenCalled();
            expect(mockConsole.error).toHaveBeenCalledWith(
                'MongoDB connection error:',
                error
            );
            expect(mockExit).toHaveBeenCalledWith(1);
        });
    });

    describe('Environment Configuration', () => {
        it('should use default MongoDB URI', async () => {
            delete process.env.MONGODB_URI;
            mongoose.connect.mockResolvedValue(undefined);

            await connectDB();

            expect(mongoose.connect).toHaveBeenCalledWith(
                'mongodb://localhost:27017/file-manager',
                expect.any(Object)
            );
        });

        it('should handle missing MONGODB_URI', async () => {
            delete process.env.MONGODB_URI;
            const error = new Error('Invalid URI');
            mongoose.connect.mockRejectedValue(error);

            await connectDB();

            expect(mongoose.connect).toHaveBeenCalled();
            expect(mockConsole.error).toHaveBeenCalled();
            expect(mockExit).toHaveBeenCalledWith(1);
        });
    });

    describe('Error Handling', () => {
        it('should handle authentication errors', async () => {
            const authError = new Error('Authentication failed');
            mongoose.connect.mockRejectedValue(authError);

            await connectDB();

            expect(mockConsole.error).toHaveBeenCalledWith(
                'MongoDB connection error:',
                authError
            );
            expect(mockExit).toHaveBeenCalledWith(1);
        });

        it('should handle network errors', async () => {
            const networkError = new Error('Network unreachable');
            mongoose.connect.mockRejectedValue(networkError);

            await connectDB();

            expect(mockConsole.error).toHaveBeenCalledWith(
                'MongoDB connection error:',
                networkError
            );
            expect(mockExit).toHaveBeenCalledWith(1);
        });

        it('should handle invalid connection string', async () => {
            const uriError = new Error('Invalid connection string');
            mongoose.connect.mockRejectedValue(uriError);

            await connectDB();

            expect(mockConsole.error).toHaveBeenCalledWith(
                'MongoDB connection error:',
                uriError
            );
            expect(mockExit).toHaveBeenCalledWith(1);
        });
    });

    describe('Connection Options', () => {
        it('should use correct connection options', async () => {
            mongoose.connect.mockResolvedValue(undefined);

            await connectDB();

            expect(mongoose.connect).toHaveBeenCalledWith(
                expect.any(String),
                {
                    useNewUrlParser: true,
                    useUnifiedTopology: true
                }
            );
        });

        it('should handle invalid connection options', async () => {
            const optionsError = new Error('Invalid options');
            mongoose.connect.mockRejectedValue(optionsError);

            await connectDB();

            expect(mockConsole.error).toHaveBeenCalledWith(
                'MongoDB connection error:',
                optionsError
            );
            expect(mockExit).toHaveBeenCalledWith(1);
        });
    });
});