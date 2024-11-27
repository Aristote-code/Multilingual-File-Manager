const request = require('supertest');
const express = require('express');
const { body } = require('express-validator');
const userRoutes = require('../../../routes/user.routes');

// Mock express-validator
jest.mock('express-validator', () => ({
    body: jest.fn().mockReturnThis(),
    trim: jest.fn().mockReturnThis(),
    isLength: jest.fn().mockReturnThis(),
    escape: jest.fn().mockReturnThis(),
    isEmail: jest.fn().mockReturnThis(),
    normalizeEmail: jest.fn().mockReturnThis(),
    optional: jest.fn().mockReturnThis(),
    isIn: jest.fn().mockReturnThis()
}));

describe('User Routes', () => {
    let app;

    beforeEach(() => {
        app = express();
        app.use(express.json());
        app.use('/api/users', userRoutes);
    });

    describe('POST /register', () => {
        it('should validate registration input', async () => {
            const response = await request(app)
                .post('/api/users/register')
                .send({
                    username: 'test',
                    email: 'test@example.com',
                    password: 'password123',
                    preferredLanguage: 'en'
                });

            expect(body).toHaveBeenCalledWith('username');
            expect(body).toHaveBeenCalledWith('email');
            expect(body).toHaveBeenCalledWith('password');
            expect(body).toHaveBeenCalledWith('preferredLanguage');
        });
    });
});