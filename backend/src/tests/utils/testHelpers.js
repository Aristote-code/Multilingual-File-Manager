const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs').promises;
const path = require('path');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const Redis = require('ioredis-mock');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../../models/User');
const File = require('../../models/File');

// Configuration
const API_URL = process.env.API_URL || 'http://localhost:5000/api';
const TEST_FILE_DIR = path.join(__dirname, '../fixtures');

// Mock Redis client
const redisMock = new Redis();

// Test user template
const generateTestUser = (prefix = '') => ({
    username: `testuser${prefix}${Date.now()}`,
    email: `test${prefix}${Date.now()}@example.com`,
    password: 'Password123!',
    preferredLanguage: 'en'
});

// Helper to create test files
async function createTestFile(filename = 'test.txt', content = 'Test file content') {
    await fs.mkdir(TEST_FILE_DIR, { recursive: true });
    const filePath = path.join(TEST_FILE_DIR, filename);
    await fs.writeFile(filePath, content);
    return filePath;
}

// Helper to clean up test files
async function cleanupTestFiles() {
    try {
        await fs.rm(TEST_FILE_DIR, { recursive: true, force: true });
    } catch (error) {
        console.error('Error cleaning up test files:', error);
    }
}

// Database helpers
let mongoServer;

async function setupTestDB() {
    try {
        mongoServer = await MongoMemoryServer.create();
        const mongoUri = mongoServer.getUri();
        await mongoose.connect(mongoUri);
    } catch (error) {
        console.error('Error setting up test database:', error);
        throw error;
    }
}

async function teardownTestDB() {
    try {
        await mongoose.disconnect();
        await mongoServer.stop();
    } catch (error) {
        console.error('Error tearing down test database:', error);
        throw error;
    }
}

async function clearTestDB() {
    const collections = mongoose.connection.collections;
    for (const key in collections) {
        await collections[key].deleteMany();
    }
}

// API test helpers
async function registerTestUser(user = generateTestUser()) {
    try {
        const response = await axios.post(`${API_URL}/auth/register`, user);
        return {
            user: response.data.user,
            token: response.data.token,
            credentials: user
        };
    } catch (error) {
        console.error('Error registering test user:', error.response?.data || error.message);
        throw error;
    }
}

async function loginTestUser(credentials) {
    try {
        const response = await axios.post(`${API_URL}/auth/login`, {
            email: credentials.email,
            password: credentials.password
        });
        return {
            token: response.data.token,
            user: response.data.user
        };
    } catch (error) {
        console.error('Error logging in test user:', error.response?.data || error.message);
        throw error;
    }
}

async function uploadTestFile(token, filePath, additionalFields = {}) {
    try {
        const formData = new FormData();
        formData.append('file', await fs.readFile(filePath), path.basename(filePath));
        
        // Add any additional fields
        Object.entries(additionalFields).forEach(([key, value]) => {
            formData.append(key, value);
        });

        const response = await axios.post(`${API_URL}/files/upload`, formData, {
            headers: {
                ...formData.getHeaders(),
                Authorization: `Bearer ${token}`
            }
        });
        return response.data;
    } catch (error) {
        console.error('Error uploading test file:', error.response?.data || error.message);
        throw error;
    }
}

// Test assertion helpers
function expectSuccessResponse(response) {
    expect(response.status).toBe(200);
    expect(response.data).toBeDefined();
}

function expectErrorResponse(error, status) {
    expect(error.response.status).toBe(status);
    expect(error.response.data.error).toBeDefined();
}

function expectValidationError(error) {
    expectErrorResponse(error, 400);
}

function expectAuthenticationError(error) {
    expectErrorResponse(error, 401);
}

function expectAuthorizationError(error) {
    expectErrorResponse(error, 403);
}

function expectNotFoundError(error) {
    expectErrorResponse(error, 404);
}

// Helper to create test users
const createTestUser = async (userData = {}) => {
  const defaultUser = {
    username: 'testuser',
    email: 'test@example.com',
    password: 'password123',
    preferredLanguage: 'en'
  };

  const user = new User({
    ...defaultUser,
    ...userData
  });

  await user.save();
  return user;
};

// Helper to create test files
const createTestFileDB = async (fileData = {}, userId) => {
  const defaultFile = {
    name: 'test-file.txt',
    path: '/test/path/test-file.txt',
    size: 1024,
    type: 'text/plain',
    owner: userId || new mongoose.Types.ObjectId(),
    sharedWith: []
  };

  const file = new File({
    ...defaultFile,
    ...fileData
  });

  await file.save();
  return file;
};

// Helper to generate JWT tokens
const generateToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: '1h'
  });
};

// Helper to hash passwords
const hashPassword = async (password) => {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
};

// Helper to create test request object
const createMockRequest = (overrides = {}) => {
  const req = {
    body: {},
    params: {},
    query: {},
    headers: {},
    ...overrides
  };
  return req;
};

// Helper to create test response object
const createMockResponse = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  return res;
};

// Helper to create test file buffer
const createTestFileBuffer = (content = 'test file content') => {
  return Buffer.from(content);
};

// Helper to clear test database
const clearDatabase = async () => {
  if (mongoose.connection.readyState === 1) {
    const collections = mongoose.connection.collections;
    for (const key in collections) {
      await collections[key].deleteMany();
    }
  }
};

module.exports = {
  API_URL,
  generateTestUser,
  createTestFile,
  cleanupTestFiles,
  setupTestDB,
  teardownTestDB,
  clearTestDB,
  registerTestUser,
  loginTestUser,
  uploadTestFile,
  redisMock,
  expectSuccessResponse,
  expectErrorResponse,
  expectValidationError,
  expectAuthenticationError,
  expectAuthorizationError,
  expectNotFoundError,
  createTestUser,
  createTestFileDB,
  generateToken,
  hashPassword,
  createMockRequest,
  createMockResponse,
  createTestFileBuffer,
  clearDatabase
};