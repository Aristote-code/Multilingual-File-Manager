const request = require('supertest');
const express = require('express');
const { body, validationResult } = require('express-validator');
const userController = require('../../../controllers/userController');
const { auth } = require('../../../middlewares/auth');
const userRoutes = require('../../../routes/user.routes');

// Mock dependencies
jest.mock('../../../controllers/userController');
jest.mock('../../../middlewares/auth');
jest.mock('express-validator', () => ({
    body: jest.fn().mockReturnThis(),
    trim: jest.fn().mockReturnThis(),
    isLength: jest.fn().mockReturnThis(),
    escape: jest.fn().mockReturnThis(),
    isEmail: jest.fn().mockReturnThis(),
    normalizeEmail: jest.fn().mockReturnThis(),
    isIn: jest.fn().mockReturnThis(),
    optional: jest.fn().mockReturnThis()
}));

describe('User Routes Unit Tests', () => {
    let app;

    beforeEach(() => {
        jest.clearAllMocks();
        // Create a new Express app for each test
        app = express();
        app.use(express.json());
        app.use('/users', userRoutes);

        // Mock auth middleware to pass by default
        auth.mockImplementation((req, res, next) => next());
    });

    describe('POST /users/register', () => {
        const validRegistration = {
            username: 'testuser',
            email: 'test@example.com',
            password: 'password123',
            preferredLanguage: 'en'
        };

        beforeEach(() => {
            userController.register.mockImplementation((req, res) => {
                res.status(201).json({ message: 'User registered successfully' });
            });
        });

        it('should register user with valid data', async () => {
            const response = await request(app)
                .post('/users/register')
                .send(validRegistration);

            expect(response.status).toBe(201);
            expect(response.body).toEqual({
                message: 'User registered successfully'
            });
            expect(userController.register).toHaveBeenCalled();
        });

        it('should validate username length', async () => {
            const response = await request(app)
                .post('/users/register')
                .send({ ...validRegistration, username: 'ab' });

            expect(response.status).toBe(400);
        });

        it('should validate email format', async () => {
            const response = await request(app)
                .post('/users/register')
                .send({ ...validRegistration, email: 'invalid-email' });

            expect(response.status).toBe(400);
        });

        it('should validate password length', async () => {
            const response = await request(app)
                .post('/users/register')
                .send({ ...validRegistration, password: '12345' });

            expect(response.status).toBe(400);
        });

        it('should validate preferred language', async () => {
            const response = await request(app)
                .post('/users/register')
                .send({ ...validRegistration, preferredLanguage: 'invalid' });

            expect(response.status).toBe(400);
        });

        it('should handle registration errors', async () => {
            userController.register.mockImplementation((req, res) => {
                res.status(500).json({ message: 'Registration failed' });
            });

            const response = await request(app)
                .post('/users/register')
                .send(validRegistration);

            expect(response.status).toBe(500);
            expect(response.body).toEqual({
                message: 'Registration failed'
            });
        });
    });

    describe('POST /users/login', () => {
        const validCredentials = {
            username: 'testuser',
            password: 'password123'
        };

        beforeEach(() => {
            userController.login.mockImplementation((req, res) => {
                res.json({ token: 'mocktoken' });
            });
        });

        it('should login with valid credentials', async () => {
            const response = await request(app)
                .post('/users/login')
                .send(validCredentials);

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('token');
            expect(userController.login).toHaveBeenCalled();
        });

        it('should handle login errors', async () => {
            userController.login.mockImplementation((req, res) => {
                res.status(401).json({ message: 'Invalid credentials' });
            });

            const response = await request(app)
                .post('/users/login')
                .send(validCredentials);

            expect(response.status).toBe(401);
            expect(response.body).toEqual({
                message: 'Invalid credentials'
            });
        });
    });

    describe('GET /users/profile', () => {
        beforeEach(() => {
            userController.getProfile.mockImplementation((req, res) => {
                res.json({ username: 'testuser', email: 'test@example.com' });
            });
        });

        it('should get user profile when authenticated', async () => {
            const response = await request(app)
                .get('/users/profile')
                .set('Authorization', 'Bearer mocktoken');

            expect(response.status).toBe(200);
            expect(response.body).toEqual({
                username: 'testuser',
                email: 'test@example.com'
            });
            expect(auth).toHaveBeenCalled();
            expect(userController.getProfile).toHaveBeenCalled();
        });

        it('should reject unauthenticated profile access', async () => {
            auth.mockImplementation((req, res, next) => {
                res.status(401).json({ message: 'Unauthorized' });
            });

            const response = await request(app)
                .get('/users/profile');

            expect(response.status).toBe(401);
            expect(userController.getProfile).not.toHaveBeenCalled();
        });
    });

    describe('PUT /users/profile', () => {
        const profileUpdate = {
            email: 'newemail@example.com',
            preferredLanguage: 'fr'
        };

        beforeEach(() => {
            userController.updateProfile.mockImplementation((req, res) => {
                res.json({ message: 'Profile updated successfully' });
            });
        });

        it('should update profile when authenticated', async () => {
            const response = await request(app)
                .put('/users/profile')
                .set('Authorization', 'Bearer mocktoken')
                .send(profileUpdate);

            expect(response.status).toBe(200);
            expect(response.body).toEqual({
                message: 'Profile updated successfully'
            });
            expect(auth).toHaveBeenCalled();
            expect(userController.updateProfile).toHaveBeenCalled();
        });

        it('should reject unauthenticated profile update', async () => {
            auth.mockImplementation((req, res, next) => {
                res.status(401).json({ message: 'Unauthorized' });
            });

            const response = await request(app)
                .put('/users/profile')
                .send(profileUpdate);

            expect(response.status).toBe(401);
            expect(userController.updateProfile).not.toHaveBeenCalled();
        });

        it('should handle update errors', async () => {
            userController.updateProfile.mockImplementation((req, res) => {
                res.status(400).json({ message: 'Invalid update data' });
            });

            const response = await request(app)
                .put('/users/profile')
                .set('Authorization', 'Bearer mocktoken')
                .send(profileUpdate);

            expect(response.status).toBe(400);
            expect(response.body).toEqual({
                message: 'Invalid update data'
            });
        });
    });

    describe('Error Handling', () => {
        it('should handle JSON parsing errors', async () => {
            const response = await request(app)
                .post('/users/register')
                .send('invalid json{')
                .set('Content-Type', 'application/json');

            expect(response.status).toBe(400);
        });

        it('should handle validation errors gracefully', async () => {
            userController.register.mockImplementation((req, res) => {
                res.status(422).json({
                    errors: [{ msg: 'Invalid value' }]
                });
            });

            const response = await request(app)
                .post('/users/register')
                .send({});

            expect(response.status).toBe(422);
            expect(response.body).toHaveProperty('errors');
        });
    });
});