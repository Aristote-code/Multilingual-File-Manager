const request = require('supertest');
const app = require('../server');
const mongoose = require('mongoose');
const User = require('../models/User');
const File = require('../models/File');

describe('File Management Tests', () => {
  let token;
  let userId;

  beforeAll(async () => {
    const user = await User.create({
      username: 'testuser',
      password: 'password123'
    });
    userId = user._id;
    
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({ username: 'testuser', password: 'password123' });
    
    token = loginResponse.body.token;
  });

  afterAll(async () => {
    await User.deleteMany({});
    await File.deleteMany({});
    await mongoose.connection.close();
  });

  test('should upload a file', async () => {
    const response = await request(app)
      .post('/api/files/upload')
      .set('Authorization', `Bearer ${token}`)
      .attach('file', '__tests__/testfile.txt');

    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty('name');
    expect(response.body).toHaveProperty('path');
  });

  test('should list user files', async () => {
    const response = await request(app)
      .get('/api/files')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBeTruthy();
  });
});