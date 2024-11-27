const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

const API_URL = 'http://localhost:5000/api';
let authToken = '';
let uploadedFileId = '';
let taskId = '';

// Test user credentials
const testUser = {
    username: 'testuser' + Date.now(), // Make username unique
    email: `test${Date.now()}@example.com`, // Make email unique
    password: 'password123',
    preferredLanguage: 'en'
};

async function runTests() {
    try {
        // 1. Register user
        console.log('\n1. Testing user registration...');
        const registerResponse = await axios.post(`${API_URL}/users/register`, testUser);
        console.log('✅ User registration successful');
        console.log('User ID:', registerResponse.data.user.id);

        // 2. Login
        console.log('\n2. Testing login...');
        const loginResponse = await axios.post(`${API_URL}/users/login`, {
            email: testUser.email,
            password: testUser.password
        });
        authToken = loginResponse.data.token;
        console.log('✅ Login successful');
        console.log('Auth Token:', authToken.substring(0, 20) + '...');

        // 3. Upload file
        console.log('\n3. Testing file upload...');
        const formData = new FormData();
        const testFile = path.join(__dirname, 'test.txt');
        // Create a test file
        fs.writeFileSync(testFile, 'This is a test file');
        formData.append('file', fs.createReadStream(testFile));

        const uploadResponse = await axios.post(`${API_URL}/files/upload`, formData, {
            headers: {
                ...formData.getHeaders(),
                Authorization: `Bearer ${authToken}`
            }
        });
        
        if (uploadResponse.data.taskId) {
            taskId = uploadResponse.data.taskId;
            console.log('✅ Large file upload queued successfully');
            console.log('Task ID:', taskId);
            
            // Check progress
            console.log('\n4. Testing progress checking...');
            let progress = 0;
            while (progress < 100) {
                const progressResponse = await axios.get(`${API_URL}/files/progress/${taskId}`, {
                    headers: { Authorization: `Bearer ${authToken}` }
                });
                progress = progressResponse.data.progress;
                console.log(`Progress: ${progress}%`);
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        } else {
            uploadedFileId = uploadResponse.data.file._id;
            console.log('✅ File upload successful');
            console.log('File ID:', uploadedFileId);
        }

        // 5. List files
        console.log('\n5. Testing file listing...');
        const listResponse = await axios.get(`${API_URL}/files`, {
            headers: { Authorization: `Bearer ${authToken}` }
        });
        console.log('✅ File listing successful');
        console.log('Files found:', listResponse.data.length);

        // 6. Search files
        console.log('\n6. Testing file search...');
        const searchResponse = await axios.get(`${API_URL}/files/search?query=test`, {
            headers: { Authorization: `Bearer ${authToken}` }
        });
        console.log('✅ File search successful');
        console.log('Search results:', searchResponse.data.length);

        // 7. Download file
        console.log('\n7. Testing file download...');
        const downloadResponse = await axios.get(`${API_URL}/files/${uploadedFileId}/download`, {
            headers: { Authorization: `Bearer ${authToken}` },
            responseType: 'stream'
        });
        const downloadPath = path.join(__dirname, 'downloaded_test.txt');
        downloadResponse.data.pipe(fs.createWriteStream(downloadPath));
        console.log('✅ File download successful');
        console.log('Downloaded to:', downloadPath);

        // 8. Clean up
        console.log('\n8. Testing file deletion...');
        console.log('Attempting to delete file ID:', uploadedFileId);
        const deleteResponse = await axios.delete(`${API_URL}/files/${uploadedFileId}`, {
            headers: { Authorization: `Bearer ${authToken}` }
        });
        console.log('✅ File deletion successful');
        console.log('Delete response:', deleteResponse.data);

        // Clean up test files
        try {
            fs.unlinkSync(testFile);
            fs.unlinkSync(downloadPath);
            console.log('Test files cleaned up successfully');
        } catch (err) {
            console.warn('Warning: Error cleaning up test files:', err.message);
        }

        console.log('\n✅ All tests completed successfully!');
    } catch (error) {
        console.error('\n❌ Test failed:');
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Data:', error.response.data);
            console.error('Headers:', error.response.headers);
        } else if (error.request) {
            console.error('No response received:', error.request);
        } else {
            console.error('Error:', error.message);
        }
        console.error('Error config:', error.config);
    }
}

// Run the tests
runTests();

const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../app');
const User = require('../models/User');
const File = require('../models/File');
const { generateToken } = require('./utils/testHelpers');

describe('API Integration Tests', () => {
    let authToken;
    let testUser;

    beforeAll(async () => {
        // Create test user
        testUser = await User.create({
            username: 'testuser',
            email: 'test@example.com',
            password: 'password123',
            preferredLanguage: 'en'
        });
        authToken = generateToken(testUser._id);
    });

    afterAll(async () => {
        await User.deleteMany({});
        await File.deleteMany({});
        await mongoose.connection.close();
    });

    describe('Auth Endpoints', () => {
        describe('POST /api/users/register', () => {
            it('should register a new user', async () => {
                const res = await request(app)
                    .post('/api/users/register')
                    .send({
                        username: 'newuser',
                        email: 'new@example.com',
                        password: 'password123',
                        preferredLanguage: 'en'
                    });

                expect(res.status).toBe(201);
                expect(res.body).toHaveProperty('token');
                expect(res.body.user).toHaveProperty('username', 'newuser');
            });

            it('should reject duplicate email', async () => {
                const res = await request(app)
                    .post('/api/users/register')
                    .send({
                        username: 'another',
                        email: 'test@example.com',
                        password: 'password123',
                        preferredLanguage: 'en'
                    });

                expect(res.status).toBe(400);
                expect(res.body).toHaveProperty('error');
            });
        });

        describe('POST /api/users/login', () => {
            it('should login existing user', async () => {
                const res = await request(app)
                    .post('/api/users/login')
                    .send({
                        email: 'test@example.com',
                        password: 'password123'
                    });

                expect(res.status).toBe(200);
                expect(res.body).toHaveProperty('token');
            });

            it('should reject invalid credentials', async () => {
                const res = await request(app)
                    .post('/api/users/login')
                    .send({
                        email: 'test@example.com',
                        password: 'wrongpassword'
                    });

                expect(res.status).toBe(401);
                expect(res.body).toHaveProperty('error');
            });
        });
    });

    describe('File Endpoints', () => {
        let testFile;

        describe('POST /api/files/upload', () => {
            it('should upload file', async () => {
                const res = await request(app)
                    .post('/api/files/upload')
                    .set('Authorization', `Bearer ${authToken}`)
                    .attach('file', Buffer.from('test content'), 'test.txt');

                expect(res.status).toBe(201);
                expect(res.body).toHaveProperty('taskId');
                testFile = res.body.file;
            });

            it('should reject unauthorized upload', async () => {
                const res = await request(app)
                    .post('/api/files/upload')
                    .attach('file', Buffer.from('test content'), 'test.txt');

                expect(res.status).toBe(401);
            });
        });

        describe('GET /api/files', () => {
            it('should list user files', async () => {
                const res = await request(app)
                    .get('/api/files')
                    .set('Authorization', `Bearer ${authToken}`);

                expect(res.status).toBe(200);
                expect(Array.isArray(res.body)).toBe(true);
            });
        });

        describe('GET /api/files/search', () => {
            it('should search files', async () => {
                const res = await request(app)
                    .get('/api/files/search')
                    .set('Authorization', `Bearer ${authToken}`)
                    .query({ q: 'test' });

                expect(res.status).toBe(200);
                expect(Array.isArray(res.body)).toBe(true);
            });
        });

        describe('GET /api/files/progress/:taskId', () => {
            it('should check upload progress', async () => {
                const res = await request(app)
                    .get(`/api/files/progress/${testFile.taskId}`)
                    .set('Authorization', `Bearer ${authToken}`);

                expect(res.status).toBe(200);
                expect(res.body).toHaveProperty('progress');
            });
        });

        describe('DELETE /api/files/:id', () => {
            it('should delete file', async () => {
                const res = await request(app)
                    .delete(`/api/files/${testFile._id}`)
                    .set('Authorization', `Bearer ${authToken}`);

                expect(res.status).toBe(200);
            });

            it('should reject unauthorized deletion', async () => {
                const res = await request(app)
                    .delete(`/api/files/${testFile._id}`);

                expect(res.status).toBe(401);
            });
        });
    });

    describe('User Profile Endpoints', () => {
        describe('GET /api/users/profile', () => {
            it('should get user profile', async () => {
                const res = await request(app)
                    .get('/api/users/profile')
                    .set('Authorization', `Bearer ${authToken}`);

                expect(res.status).toBe(200);
                expect(res.body).toHaveProperty('username', testUser.username);
            });
        });

        describe('PUT /api/users/profile', () => {
            it('should update user profile', async () => {
                const res = await request(app)
                    .put('/api/users/profile')
                    .set('Authorization', `Bearer ${authToken}`)
                    .send({
                        preferredLanguage: 'fr'
                    });

                expect(res.status).toBe(200);
                expect(res.body.preferredLanguage).toBe('fr');
            });
        });
    });

    describe('Error Handling', () => {
        it('should handle 404 routes', async () => {
            const res = await request(app)
                .get('/api/nonexistent');

            expect(res.status).toBe(404);
        });

        it('should handle validation errors', async () => {
            const res = await request(app)
                .post('/api/users/register')
                .send({
                    username: 'a',
                    email: 'invalid',
                    password: '123'
                });

            expect(res.status).toBe(400);
            expect(res.body).toHaveProperty('error');
        });
    });
});