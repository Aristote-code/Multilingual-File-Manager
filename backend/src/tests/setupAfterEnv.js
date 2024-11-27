const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const path = require('path');
const fs = require('fs');

// Create test directories
const testDirectories = {
    uploadsDir: path.join(__dirname, '../../uploads'),
    testUploadsDir: path.join(__dirname, '../test-uploads')
};

// Ensure test directories exist
Object.values(testDirectories).forEach(dir => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
});

// Set global paths for tests
global.__TEST_UPLOAD_DIR__ = testDirectories.testUploadsDir;
global.__UPLOADS_DIR__ = testDirectories.uploadsDir;

let mongoServer;
const originalConsole = {
    log: console.log,
    error: console.error,
    warn: console.warn,
    info: console.info
};

beforeAll(async () => {
    // Start MongoDB Memory Server
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);
    console.log('Test database setup completed');

    // Create test user
    const hashedPassword = await bcrypt.hash('testpassword', 10);
    const testUser = new User({
        username: 'testuser',
        email: 'test@example.com',
        password: hashedPassword,
        role: 'user',
        preferredLanguage: 'en'
    });

    await testUser.save();

    // Generate JWT token with proper payload structure
    const token = jwt.sign(
        { 
            userId: testUser._id,
            username: testUser.username,
            role: testUser.role 
        },
        process.env.JWT_SECRET || 'your-secret-key',
        { expiresIn: '24h' }
    );

    // Set global variables for tests
    global.__TEST_TOKEN__ = token;
    global.__TEST_USER__ = testUser;

    console.log('Test setup completed');
    console.log('Test user ID:', testUser._id);
    console.log('Auth token:', token);
});

afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();

    // Clean up test directories
    Object.values(testDirectories).forEach(dir => {
        if (fs.existsSync(dir)) {
            fs.rmSync(dir, { recursive: true, force: true });
        }
    });
});

// Override console methods for cleaner test output
console.log = (...args) => {
    if (process.env.DEBUG) {
        originalConsole.log(...args);
    }
};

console.error = (...args) => {
    if (process.env.DEBUG) {
        originalConsole.error(...args);
    }
};

console.warn = (...args) => {
    if (process.env.DEBUG) {
        originalConsole.warn(...args);
    }
};

console.info = (...args) => {
    if (process.env.DEBUG) {
        originalConsole.info(...args);
    }
};