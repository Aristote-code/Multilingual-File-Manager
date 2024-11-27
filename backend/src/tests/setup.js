const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');
const Redis = require('ioredis-mock');
const fs = require('fs').promises;
const path = require('path');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const bcrypt = require('bcryptjs');

// Mock Redis client
const mockRedis = new Redis({
    data: {
        // Add any initial Redis data here
    }
});

// Store mock implementations
global.__mocks__ = {
    fs: {
        mkdir: async () => undefined,
        writeFile: async () => undefined,
        readFile: async () => 'mock file content',
        unlink: async () => undefined,
        rm: async () => undefined
    },
    redis: mockRedis
};

let mongoServer;

async function setupDatabase() {
    try {
        // Create MongoDB Memory Server
        mongoServer = await MongoMemoryServer.create();
        const mongoUri = mongoServer.getUri();
        
        // Store MongoDB instance globally
        global.__MONGOD__ = mongoServer;
        
        // Set MongoDB URI for all tests
        process.env.MONGODB_URI = mongoUri;

        // Connect to in-memory database with proper options
        await mongoose.connect(mongoUri, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            // Add these options to handle connection issues
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
            maxPoolSize: 10
        });

        // Set test JWT secret
        process.env.JWT_SECRET = 'test-jwt-secret';

        // Hash password for test user
        const hashedPassword = await bcrypt.hash('Test123!@#', 10);

        // Create test user with all required fields
        const testUser = new User({
            username: 'testuser',
            email: 'test@example.com',
            password: hashedPassword,
            preferredLanguage: 'en',
            role: 'user'
        });

        // Save user and wait for it to complete
        const savedUser = await testUser.save();

        // Generate test token
        const token = jwt.sign(
            { userId: savedUser._id },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        // Store test user and token globally
        global.__TEST_USER__ = savedUser;
        global.__TEST_TOKEN__ = token;

        // Clear all other collections
        const collections = mongoose.connection.collections;
        for (const key in collections) {
            if (key !== 'users') {
                await collections[key].deleteMany();
            }
        }

        console.log('Test database setup completed');
        console.log('Test user created with token:', token);
        console.log('Test user ID:', savedUser._id);
    } catch (error) {
        console.error('Error setting up test database:', error);
        throw error;
    }
}

async function setupTestFiles() {
    // Create test upload directory
    const uploadsDir = path.join(__dirname, '../../uploads');
    const testUploadsDir = path.join(__dirname, '../test-uploads');
    
    // Set environment variables for file paths
    process.env.FILE_UPLOAD_PATH = uploadsDir;
    process.env.TEST_UPLOAD_PATH = testUploadsDir;
    
    try {
        // Create both directories
        await fs.mkdir(uploadsDir, { recursive: true });
        await fs.mkdir(testUploadsDir, { recursive: true });
        console.log('Test directories created:', { uploadsDir, testUploadsDir });
    } catch (error) {
        if (error.code !== 'EEXIST') {
            console.error('Error creating upload directories:', error);
            throw error;
        }
    }
}

async function setup() {
    try {
        // Set test environment variables
        process.env.NODE_ENV = 'test';
        process.env.REDIS_URL = 'redis://localhost:6379';
        process.env.MAX_FILE_SIZE = '10485760'; // 10MB

        // Setup database and test files
        await setupDatabase();
        await setupTestFiles();

        // Add cleanup handler
        process.on('SIGTERM', async () => {
            await mongoose.disconnect();
            await mongoServer.stop();
        });
    } catch (error) {
        console.error('Setup failed:', error);
        // Cleanup on error
        if (mongoose.connection.readyState !== 0) {
            await mongoose.disconnect();
        }
        if (mongoServer) {
            await mongoServer.stop();
        }
        throw error;
    }
}

module.exports = setup;