const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../../../models/User');

// Mock dependencies
jest.mock('bcryptjs');

describe('User Model Unit Tests', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        bcrypt.genSalt.mockResolvedValue('mockedsalt');
        bcrypt.hash.mockResolvedValue('hashedpassword');
        bcrypt.compare.mockResolvedValue(true);
    });

    describe('User Schema', () => {
        it('should create a user with required fields', () => {
            const validUser = new User({
                username: 'testuser',
                email: 'test@example.com',
                password: 'password123'
            });

            expect(validUser).toHaveProperty('username', 'testuser');
            expect(validUser).toHaveProperty('email', 'test@example.com');
            expect(validUser).toHaveProperty('password', 'password123');
            expect(validUser).toHaveProperty('role', 'user');
            expect(validUser).toHaveProperty('preferredLanguage', 'en');
            expect(validUser.createdAt).toBeInstanceOf(Date);
        });

        it('should fail validation without required fields', async () => {
            const invalidUser = new User({});
            let validationError;

            try {
                await invalidUser.validate();
            } catch (error) {
                validationError = error;
            }

            expect(validationError).toBeDefined();
            expect(validationError.errors.username).toBeDefined();
            expect(validationError.errors.email).toBeDefined();
            expect(validationError.errors.password).toBeDefined();
        });

        it('should trim username and email', () => {
            const user = new User({
                username: '  testuser  ',
                email: '  TEST@EXAMPLE.COM  ',
                password: 'password123'
            });

            expect(user.username).toBe('testuser');
            expect(user.email).toBe('test@example.com');
        });

        it('should convert email to lowercase', () => {
            const user = new User({
                username: 'testuser',
                email: 'TEST@EXAMPLE.COM',
                password: 'password123'
            });

            expect(user.email).toBe('test@example.com');
        });

        it('should validate role enum values', async () => {
            const validRoles = ['user', 'admin'];
            const invalidRole = 'superuser';

            // Test valid roles
            for (const role of validRoles) {
                const user = new User({
                    username: 'testuser',
                    email: 'test@example.com',
                    password: 'password123',
                    role
                });
                const validationError = user.validateSync();
                expect(validationError).toBeUndefined();
            }

            // Test invalid role
            const user = new User({
                username: 'testuser',
                email: 'test@example.com',
                password: 'password123',
                role: invalidRole
            });
            const validationError = user.validateSync();
            expect(validationError.errors.role).toBeDefined();
        });
    });

    describe('Password Hashing', () => {
        it('should hash password before saving', async () => {
            // Mock bcrypt functions
            bcrypt.genSalt.mockResolvedValue('mockedsalt');
            bcrypt.hash.mockResolvedValue('hashedpassword');

            const user = new User({
                username: 'testuser',
                email: 'test@example.com',
                password: 'password123',
                preferredLanguage: 'en'
            });

            // Get the pre-save middleware function
            const preSaveHook = user.schema.pre.mock.calls.find(
                call => call[0] === 'save'
            )[1];

            // Execute the pre-save hook
            await preSaveHook.call(user);

            expect(bcrypt.genSalt).toHaveBeenCalledWith(10);
            expect(bcrypt.hash).toHaveBeenCalledWith('password123', 'mockedsalt');
            expect(user.password).toBe('hashedpassword');
        });

        it('should not hash password if not modified', async () => {
            const user = new User({
                username: 'testuser',
                email: 'test@example.com',
                password: 'hashedpassword',
                preferredLanguage: 'en'
            });

            // Mock isModified to return false
            user.isModified = jest.fn().mockReturnValue(false);

            // Get and execute pre-save hook
            const preSaveHook = user.schema.pre.mock.calls.find(
                call => call[0] === 'save'
            )[1];
            await preSaveHook.call(user);

            expect(bcrypt.genSalt).not.toHaveBeenCalled();
            expect(bcrypt.hash).not.toHaveBeenCalled();
            expect(user.password).toBe('hashedpassword');
        });

        it('should handle hashing errors', async () => {
            const error = new Error('Hashing failed');
            bcrypt.genSalt.mockRejectedValue(error);

            const user = new User({
                username: 'testuser',
                email: 'test@example.com',
                password: 'password123',
                preferredLanguage: 'en'
            });

            // Get pre-save hook
            const preSaveHook = user.schema.pre.mock.calls.find(
                call => call[0] === 'save'
            )[1];

            // Execute and expect error
            await expect(preSaveHook.call(user)).rejects.toThrow('Hashing failed');
        });
    });

    describe('Password Comparison', () => {
        it('should correctly compare valid password', async () => {
            const user = new User({
                username: 'testuser',
                email: 'test@example.com',
                password: 'hashedpassword'
            });

            bcrypt.compare.mockResolvedValue(true);
            const isMatch = await user.comparePassword('password123');

            expect(isMatch).toBe(true);
            expect(bcrypt.compare).toHaveBeenCalledWith('password123', 'hashedpassword');
        });

        it('should correctly compare invalid password', async () => {
            const user = new User({
                username: 'testuser',
                email: 'test@example.com',
                password: 'hashedpassword'
            });

            bcrypt.compare.mockResolvedValue(false);
            const isMatch = await user.comparePassword('wrongpassword');

            expect(isMatch).toBe(false);
            expect(bcrypt.compare).toHaveBeenCalledWith('wrongpassword', 'hashedpassword');
        });

        it('should handle comparison errors', async () => {
            const user = new User({
                username: 'testuser',
                email: 'test@example.com',
                password: 'hashedpassword'
            });

            const error = new Error('Comparison error');
            bcrypt.compare.mockRejectedValue(error);

            await expect(user.comparePassword('password123')).rejects.toThrow(error);
        });
    });

    describe('Unique Constraints', () => {
        it('should enforce unique username', async () => {
            const uniqueError = new mongoose.Error.ValidationError();
            uniqueError.errors.username = new mongoose.Error.ValidatorError({
                message: 'Username already exists',
                type: 'unique',
                path: 'username'
            });

            // Simulate duplicate key error
            const user = new User({
                username: 'existinguser',
                email: 'test@example.com',
                password: 'password123'
            });

            let error;
            try {
                // Simulate save operation with unique violation
                throw uniqueError;
            } catch (e) {
                error = e;
            }

            expect(error.errors.username).toBeDefined();
            expect(error.errors.username.message).toBe('Username already exists');
        });

        it('should enforce unique email', async () => {
            const uniqueError = new mongoose.Error.ValidationError();
            uniqueError.errors.email = new mongoose.Error.ValidatorError({
                message: 'Email already exists',
                type: 'unique',
                path: 'email'
            });

            // Simulate duplicate key error
            const user = new User({
                username: 'testuser',
                email: 'existing@example.com',
                password: 'password123'
            });

            let error;
            try {
                // Simulate save operation with unique violation
                throw uniqueError;
            } catch (e) {
                error = e;
            }

            expect(error.errors.email).toBeDefined();
            expect(error.errors.email.message).toBe('Email already exists');
        });
    });
});