const request = require('supertest');
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../../../models/User');
const authRoutes = require('../../../routes/auth.routes');

// Mock dependencies
jest.mock('bcryptjs');
jest.mock('jsonwebtoken');
jest.mock('../../../models/User');

describe('Auth Routes Unit Tests', () => {
    let app;

    beforeEach(() => {
        jest.clearAllMocks();
        // Create a new Express app for each test
        app = express();
        app.use(express.json());
        app.use('/auth', authRoutes);

        // Default JWT mock implementation
        jwt.sign.mockReturnValue('mocktoken');
    });

    describe('POST /auth/register', () => {
        const validRegistration = {
            username: 'testuser',
            password: 'password123'
        };

        it('should register a new user successfully', async () => {
            User.findOne.mockResolvedValue(null);
            User.prototype.save = jest.fn().mockResolvedValue(true);

            const response = await request(app)
                .post('/auth/register')
                .send(validRegistration);

            expect(response.status).toBe(201);
            expect(response.body).toEqual({
                message: 'User registered successfully'
            });
            expect(User.prototype.save).toHaveBeenCalled();
        });

        it('should reject registration with existing username', async () => {
            User.findOne.mockResolvedValue({ username: 'testuser' });

            const response = await request(app)
                .post('/auth/register')
                .send(validRegistration);

            expect(response.status).toBe(400);
            expect(response.body).toEqual({
                message: 'Username already exists'
            });
            expect(User.prototype.save).not.toHaveBeenCalled();
        });

        it('should handle registration errors', async () => {
            User.findOne.mockResolvedValue(null);
            User.prototype.save = jest.fn().mockRejectedValue(new Error('Database error'));

            const response = await request(app)
                .post('/auth/register')
                .send(validRegistration);

            expect(response.status).toBe(500);
            expect(response.body).toEqual({
                message: 'Error registering user'
            });
        });

        it('should validate required fields', async () => {
            const response = await request(app)
                .post('/auth/register')
                .send({});

            expect(response.status).toBe(500);
            expect(response.body.message).toBe('Error registering user');
        });
    });

    describe('POST /auth/login', () => {
        const validCredentials = {
            username: 'testuser',
            password: 'password123'
        };

        beforeEach(() => {
            process.env.JWT_SECRET = 'testsecret';
        });

        it('should login user with valid credentials', async () => {
            const mockUser = {
                _id: 'user123',
                username: 'testuser',
                comparePassword: jest.fn().mockResolvedValue(true)
            };
            User.findOne.mockResolvedValue(mockUser);

            const response = await request(app)
                .post('/auth/login')
                .send(validCredentials);

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('token', 'mocktoken');
            expect(jwt.sign).toHaveBeenCalledWith(
                { id: mockUser._id },
                process.env.JWT_SECRET,
                { expiresIn: '1d' }
            );
        });

        it('should reject login with invalid username', async () => {
            User.findOne.mockResolvedValue(null);

            const response = await request(app)
                .post('/auth/login')
                .send(validCredentials);

            expect(response.status).toBe(401);
            expect(response.body).toEqual({
                message: 'Invalid credentials'
            });
            expect(jwt.sign).not.toHaveBeenCalled();
        });

        it('should reject login with invalid password', async () => {
            const mockUser = {
                username: 'testuser',
                comparePassword: jest.fn().mockResolvedValue(false)
            };
            User.findOne.mockResolvedValue(mockUser);

            const response = await request(app)
                .post('/auth/login')
                .send(validCredentials);

            expect(response.status).toBe(401);
            expect(response.body).toEqual({
                message: 'Invalid credentials'
            });
            expect(jwt.sign).not.toHaveBeenCalled();
        });

        it('should handle login errors', async () => {
            User.findOne.mockRejectedValue(new Error('Database error'));

            const response = await request(app)
                .post('/auth/login')
                .send(validCredentials);

            expect(response.status).toBe(500);
            expect(response.body).toEqual({
                message: 'Error logging in'
            });
            expect(jwt.sign).not.toHaveBeenCalled();
        });

        it('should validate required fields', async () => {
            const response = await request(app)
                .post('/auth/login')
                .send({});

            expect(response.status).toBe(500);
            expect(response.body.message).toBe('Error logging in');
        });

        it('should handle password comparison errors', async () => {
            const mockUser = {
                username: 'testuser',
                comparePassword: jest.fn().mockRejectedValue(new Error('Comparison error'))
            };
            User.findOne.mockResolvedValue(mockUser);

            const response = await request(app)
                .post('/auth/login')
                .send(validCredentials);

            expect(response.status).toBe(500);
            expect(response.body.message).toBe('Error logging in');
        });
    });

    describe('Error Handling', () => {
        it('should handle JSON parsing errors', async () => {
            const response = await request(app)
                .post('/auth/register')
                .send('invalid json{')
                .set('Content-Type', 'application/json');

            expect(response.status).toBe(400);
        });

        it('should handle missing request body', async () => {
            const response = await request(app)
                .post('/auth/login')
                .send();

            expect(response.status).toBe(500);
            expect(response.body.message).toBe('Error logging in');
        });
    });
});