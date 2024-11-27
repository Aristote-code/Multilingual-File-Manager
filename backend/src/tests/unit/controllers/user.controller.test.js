const userController = require('../../../controllers/userController');
const User = require('../../../models/User');
const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');

// Mock dependencies
jest.mock('../../../models/User');
jest.mock('jsonwebtoken');
jest.mock('express-validator');

describe('User Controller Unit Tests', () => {
    let mockReq;
    let mockRes;
    const mockUserId = 'user123';
    const mockToken = 'mock.jwt.token';

    beforeEach(() => {
        // Reset all mocks
        jest.clearAllMocks();

        // Mock request object
        mockReq = {
            body: {
                username: 'testuser',
                email: 'test@example.com',
                password: 'password123',
                preferredLanguage: 'en'
            },
            user: { _id: mockUserId }
        };

        // Mock response object
        mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };

        // Mock validation result
        validationResult.mockReturnValue({
            isEmpty: () => true,
            array: () => []
        });

        // Mock JWT sign
        jwt.sign.mockReturnValue(mockToken);
    });

    describe('register', () => {
        it('should register a new user successfully', async () => {
            const mockUser = {
                _id: mockUserId,
                username: mockReq.body.username,
                email: mockReq.body.email,
                preferredLanguage: mockReq.body.preferredLanguage,
                role: 'user',
                save: jest.fn()
            };

            User.findOne.mockResolvedValue(null);
            User.mockImplementation(() => mockUser);

            await userController.register(mockReq, mockRes);

            expect(User.findOne).toHaveBeenCalledWith({
                $or: [
                    { email: mockReq.body.email },
                    { username: mockReq.body.username }
                ]
            });
            expect(mockUser.save).toHaveBeenCalled();
            expect(jwt.sign).toHaveBeenCalledWith(
                { userId: mockUserId },
                process.env.JWT_SECRET,
                { expiresIn: '24h' }
            );
            expect(mockRes.status).toHaveBeenCalledWith(201);
            expect(mockRes.json).toHaveBeenCalledWith({
                message: 'User registered successfully',
                token: mockToken,
                user: {
                    id: mockUserId,
                    username: mockReq.body.username,
                    email: mockReq.body.email,
                    preferredLanguage: mockReq.body.preferredLanguage,
                    role: 'user'
                }
            });
        });

        it('should handle validation errors', async () => {
            validationResult.mockReturnValue({
                isEmpty: () => false,
                array: () => [{ msg: 'Invalid email' }]
            });

            await userController.register(mockReq, mockRes);

            expect(mockRes.status).toHaveBeenCalledWith(400);
            expect(mockRes.json).toHaveBeenCalledWith({
                errors: [{ msg: 'Invalid email' }]
            });
        });

        it('should handle existing user', async () => {
            User.findOne.mockResolvedValue({ email: mockReq.body.email });

            await userController.register(mockReq, mockRes);

            expect(mockRes.status).toHaveBeenCalledWith(400);
            expect(mockRes.json).toHaveBeenCalledWith({
                error: 'User already exists with this email or username'
            });
        });

        it('should handle server errors', async () => {
            User.findOne.mockRejectedValue(new Error('DB Error'));

            await userController.register(mockReq, mockRes);

            expect(mockRes.status).toHaveBeenCalledWith(500);
            expect(mockRes.json).toHaveBeenCalledWith({
                error: 'Server error during registration'
            });
        });
    });

    describe('login', () => {
        it('should login user successfully', async () => {
            const mockUser = {
                _id: mockUserId,
                username: mockReq.body.username,
                email: mockReq.body.email,
                preferredLanguage: mockReq.body.preferredLanguage,
                role: 'user',
                comparePassword: jest.fn().mockResolvedValue(true)
            };

            User.findOne.mockResolvedValue(mockUser);

            await userController.login(mockReq, mockRes);

            expect(User.findOne).toHaveBeenCalledWith({
                email: mockReq.body.email
            });
            expect(mockUser.comparePassword).toHaveBeenCalledWith(
                mockReq.body.password
            );
            expect(jwt.sign).toHaveBeenCalledWith(
                { userId: mockUserId },
                process.env.JWT_SECRET,
                { expiresIn: '24h' }
            );
            expect(mockRes.json).toHaveBeenCalledWith({
                token: mockToken,
                user: {
                    id: mockUserId,
                    username: mockReq.body.username,
                    email: mockReq.body.email,
                    preferredLanguage: mockReq.body.preferredLanguage,
                    role: 'user'
                }
            });
        });

        it('should handle non-existent user', async () => {
            User.findOne.mockResolvedValue(null);

            await userController.login(mockReq, mockRes);

            expect(mockRes.status).toHaveBeenCalledWith(401);
            expect(mockRes.json).toHaveBeenCalledWith({
                error: 'Invalid credentials'
            });
        });

        it('should handle incorrect password', async () => {
            const mockUser = {
                comparePassword: jest.fn().mockResolvedValue(false)
            };
            User.findOne.mockResolvedValue(mockUser);

            await userController.login(mockReq, mockRes);

            expect(mockRes.status).toHaveBeenCalledWith(401);
            expect(mockRes.json).toHaveBeenCalledWith({
                error: 'Invalid credentials'
            });
        });

        it('should handle server errors', async () => {
            User.findOne.mockRejectedValue(new Error('DB Error'));

            await userController.login(mockReq, mockRes);

            expect(mockRes.status).toHaveBeenCalledWith(500);
            expect(mockRes.json).toHaveBeenCalledWith({
                error: 'Server error during login'
            });
        });
    });

    describe('getProfile', () => {
        it('should return user profile', async () => {
            const mockUser = {
                _id: mockUserId,
                username: mockReq.body.username,
                email: mockReq.body.email,
                preferredLanguage: mockReq.body.preferredLanguage,
                role: 'user'
            };

            User.findById.mockReturnValue({
                select: jest.fn().mockResolvedValue(mockUser)
            });

            await userController.getProfile(mockReq, mockRes);

            expect(User.findById).toHaveBeenCalledWith(mockUserId);
            expect(mockRes.json).toHaveBeenCalledWith(mockUser);
        });

        it('should handle server errors', async () => {
            User.findById.mockReturnValue({
                select: jest.fn().mockRejectedValue(new Error('DB Error'))
            });

            await userController.getProfile(mockReq, mockRes);

            expect(mockRes.status).toHaveBeenCalledWith(500);
            expect(mockRes.json).toHaveBeenCalledWith({
                error: 'Error fetching user profile'
            });
        });
    });

    describe('updateProfile', () => {
        it('should update user profile successfully', async () => {
            const updates = {
                username: 'newusername',
                preferredLanguage: 'es'
            };
            mockReq.body = updates;

            const mockUser = {
                _id: mockUserId,
                ...updates,
                email: mockReq.body.email,
                role: 'user',
                save: jest.fn()
            };

            User.findById.mockResolvedValue(mockUser);

            await userController.updateProfile(mockReq, mockRes);

            expect(User.findById).toHaveBeenCalledWith(mockUserId);
            expect(mockUser.username).toBe(updates.username);
            expect(mockUser.preferredLanguage).toBe(updates.preferredLanguage);
            expect(mockUser.save).toHaveBeenCalled();
            expect(mockRes.json).toHaveBeenCalledWith(mockUser);
        });

        it('should handle non-existent user', async () => {
            User.findById.mockResolvedValue(null);

            await userController.updateProfile(mockReq, mockRes);

            expect(mockRes.status).toHaveBeenCalledWith(404);
            expect(mockRes.json).toHaveBeenCalledWith({
                error: 'User not found'
            });
        });

        it('should handle server errors', async () => {
            User.findById.mockRejectedValue(new Error('DB Error'));

            await userController.updateProfile(mockReq, mockRes);

            expect(mockRes.status).toHaveBeenCalledWith(500);
            expect(mockRes.json).toHaveBeenCalledWith({
                error: 'Error updating user profile'
            });
        });
    });
});