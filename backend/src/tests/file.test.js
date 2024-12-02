const { describe, test, expect, beforeAll, afterAll } = require('@jest/globals');
const request = require('supertest');
const { app, connectDB } = require('../server');
const mongoose = require('mongoose');
const User = require('../models/User');
const File = require('../models/File');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

describe('File Management Tests', () => {
  let token;
  let userId;
  const testFilePath = path.join(__dirname, 'testfile.txt');

  beforeAll(async () => {
    // Connect to the test database
    await connectDB();

    // Create test file
    fs.writeFileSync(testFilePath, 'test content');

    // Create a test user with hashed password
    const hashedPassword = await bcrypt.hash('password123', 10);
    const user = await User.create({
      username: 'testuser',
      password: hashedPassword
    });
    userId = user._id;
    
    // Generate token manually instead of using login endpoint
    token = jwt.sign(
      { id: user._id, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    // Create test upload directory
    const uploadDir = path.join(__dirname, '../../uploads-test');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
  });

  afterAll(async () => {
    // Cleanup
    if (fs.existsSync(testFilePath)) {
      fs.unlinkSync(testFilePath);
    }
    const uploadDir = path.join(__dirname, '../../uploads-test');
    if (fs.existsSync(uploadDir)) {
      fs.rmSync(uploadDir, { recursive: true, force: true });
    }
    await User.deleteMany({});
    await File.deleteMany({});
    
    // Close database connection
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
  });

  describe('File Upload', () => {
    test('should upload a file successfully', async () => {
      const response = await request(app)
        .post('/api/files/upload')
        .set('Authorization', `Bearer ${token}`)
        .attach('file', testFilePath);

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('name');
      expect(response.body).toHaveProperty('path');
      expect(response.body).toHaveProperty('jobId');
    });

    test('should fail without authentication', async () => {
      const response = await request(app)
        .post('/api/files/upload')
        .attach('file', testFilePath);

      expect(response.status).toBe(401);
    });
  });

  describe('File Listing', () => {
    test('should list user files', async () => {
      const response = await request(app)
        .get('/api/files')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBeTruthy();
    });
  });

  describe('File Queue', () => {
    test('should track file processing status', async () => {
      const uploadResponse = await request(app)
        .post('/api/files/upload')
        .set('Authorization', `Bearer ${token}`)
        .attach('file', testFilePath);

      const jobId = uploadResponse.body.jobId;

      const statusResponse = await request(app)
        .get(`/api/files/job/${jobId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(statusResponse.status).toBe(200);
      expect(statusResponse.body).toHaveProperty('state');
      expect(statusResponse.body).toHaveProperty('progress');
    });
  });
}); 