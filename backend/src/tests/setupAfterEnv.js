const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { User } = require('../../src/models');

let mongoServer;
const originalConsole = {
    log: console.log,
    error: console.error,
    warn: console.warn,
    info: console.info,
    debug: console.debug
};

// Setup MongoDB Memory Server
beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    
    try {
        await mongoose.connect(mongoUri);
        
        // Set up test environment variables
        process.env.JWT_SECRET = 'test-jwt-secret';
        process.env.FILE_UPLOAD_PATH = './uploads/test';
        
        // Create test user
        const testUser = new User({
            username: 'testuser',
            email: 'test@example.com',
            password: await bcrypt.hash('password123', 10),
            preferredLanguage: 'en'
        });
        
        await testUser.save();
        global.testUser = testUser;
        global.testUserToken = jwt.sign(
            { id: testUser._id },
            process.env.JWT_SECRET
        );
    } catch (error) {
        console.error('Error setting up test database:', error);
        throw error;
    }
});

// Clear database between tests
beforeEach(async () => {
    // Mock console methods
    console.log = jest.fn();
    console.error = jest.fn();
    console.warn = jest.fn();
    console.info = jest.fn();
    console.debug = jest.fn();

    // Clear all collections except users
    const collections = mongoose.connection.collections;
    for (const key in collections) {
        if (key !== 'users') {
            await collections[key].deleteMany();
        }
    }
});

// Restore console after each test
afterEach(() => {
    console.log = originalConsole.log;
    console.error = originalConsole.error;
    console.warn = originalConsole.warn;
    console.info = originalConsole.info;
    console.debug = originalConsole.debug;
});

// Cleanup after all tests
afterAll(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
    await mongoServer.stop();
});

// Global mocks
global.__mocks__ = {
    fs: {
        promises: {
            readFile: jest.fn(),
            writeFile: jest.fn(),
            unlink: jest.fn()
        }
    }
};