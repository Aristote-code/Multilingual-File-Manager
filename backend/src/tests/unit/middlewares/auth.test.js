const jwt = require('jsonwebtoken');
const User = require('../../../models/User');
const { auth, isAdmin } = require('../../../middlewares/auth');

// Mock dependencies
jest.mock('jsonwebtoken');
jest.mock('../../../models/User');

describe('Auth Middleware Unit Tests', () => {
    let mockReq;
    let mockRes;
    let nextFunction;
    const mockToken = 'mock.jwt.token';
    const mockUserId = 'user123';

    beforeEach(() => {
        // Reset all mocks
        jest.clearAllMocks();

        // Mock request object
        mockReq = {
            header: jest.fn(),
            user: null,
            token: null
        };

        // Mock response object
        mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };

        // Mock next function
        nextFunction = jest.fn();

        // Default JWT verification
        jwt.verify.mockReturnValue({ userId: mockUserId });
    });

    describe('auth middleware', () => {
        it('should authenticate valid token', async () => {
            const mockUser = { _id: mockUserId, role: 'user' };
            mockReq.header.mockReturnValue(`Bearer ${mockToken}`);
            User.findById.mockResolvedValue(mockUser);

            await auth(mockReq, mockRes, nextFunction);

            expect(jwt.verify).toHaveBeenCalledWith(mockToken, process.env.JWT_SECRET);
            expect(User.findById).toHaveBeenCalledWith(mockUserId);
            expect(mockReq.user).toBe(mockUser);
            expect(mockReq.token).toBe(mockToken);
            expect(nextFunction).toHaveBeenCalled();
        });

        it('should handle missing token', async () => {
            mockReq.header.mockReturnValue(null);

            await auth(mockReq, mockRes, nextFunction);

            expect(mockRes.status).toHaveBeenCalledWith(401);
            expect(mockRes.json).toHaveBeenCalledWith({
                error: 'Please authenticate'
            });
            expect(nextFunction).not.toHaveBeenCalled();
        });

        it('should handle invalid token format', async () => {
            mockReq.header.mockReturnValue('InvalidTokenFormat');

            await auth(mockReq, mockRes, nextFunction);

            expect(mockRes.status).toHaveBeenCalledWith(401);
            expect(mockRes.json).toHaveBeenCalledWith({
                error: 'Please authenticate'
            });
            expect(nextFunction).not.toHaveBeenCalled();
        });

        it('should handle JWT verification failure', async () => {
            mockReq.header.mockReturnValue(`Bearer ${mockToken}`);
            jwt.verify.mockImplementation(() => {
                throw new Error('Invalid token');
            });

            await auth(mockReq, mockRes, nextFunction);

            expect(mockRes.status).toHaveBeenCalledWith(401);
            expect(mockRes.json).toHaveBeenCalledWith({
                error: 'Please authenticate'
            });
            expect(nextFunction).not.toHaveBeenCalled();
        });

        it('should handle non-existent user', async () => {
            mockReq.header.mockReturnValue(`Bearer ${mockToken}`);
            User.findById.mockResolvedValue(null);

            await auth(mockReq, mockRes, nextFunction);

            expect(mockRes.status).toHaveBeenCalledWith(401);
            expect(mockRes.json).toHaveBeenCalledWith({
                error: 'Please authenticate'
            });
            expect(nextFunction).not.toHaveBeenCalled();
        });

        it('should handle database errors', async () => {
            mockReq.header.mockReturnValue(`Bearer ${mockToken}`);
            User.findById.mockRejectedValue(new Error('Database error'));

            await auth(mockReq, mockRes, nextFunction);

            expect(mockRes.status).toHaveBeenCalledWith(401);
            expect(mockRes.json).toHaveBeenCalledWith({
                error: 'Please authenticate'
            });
            expect(nextFunction).not.toHaveBeenCalled();
        });
    });

    describe('isAdmin middleware', () => {
        beforeEach(() => {
            // Set up authenticated user in request
            mockReq.user = { _id: mockUserId };
        });

        it('should allow admin access', async () => {
            mockReq.user.role = 'admin';

            await isAdmin(mockReq, mockRes, nextFunction);

            expect(nextFunction).toHaveBeenCalled();
        });

        it('should deny non-admin access', async () => {
            mockReq.user.role = 'user';

            await isAdmin(mockReq, mockRes, nextFunction);

            expect(mockRes.status).toHaveBeenCalledWith(403);
            expect(mockRes.json).toHaveBeenCalledWith({
                error: 'Access denied'
            });
            expect(nextFunction).not.toHaveBeenCalled();
        });

        it('should handle missing role', async () => {
            delete mockReq.user.role;

            await isAdmin(mockReq, mockRes, nextFunction);

            expect(mockRes.status).toHaveBeenCalledWith(403);
            expect(mockRes.json).toHaveBeenCalledWith({
                error: 'Access denied'
            });
            expect(nextFunction).not.toHaveBeenCalled();
        });

        it('should handle missing user object', async () => {
            mockReq.user = null;

            await isAdmin(mockReq, mockRes, nextFunction);

            expect(mockRes.status).toHaveBeenCalledWith(403);
            expect(mockRes.json).toHaveBeenCalledWith({
                error: 'Access denied'
            });
            expect(nextFunction).not.toHaveBeenCalled();
        });
    });

    describe('auth middleware integration with isAdmin', () => {
        it('should work together for admin user', async () => {
            const mockAdminUser = { _id: mockUserId, role: 'admin' };
            mockReq.header.mockReturnValue(`Bearer ${mockToken}`);
            User.findById.mockResolvedValue(mockAdminUser);

            await auth(mockReq, mockRes, nextFunction);
            expect(nextFunction).toHaveBeenCalled();

            nextFunction.mockClear();
            await isAdmin(mockReq, mockRes, nextFunction);
            expect(nextFunction).toHaveBeenCalled();
        });

        it('should deny access for authenticated non-admin user', async () => {
            const mockRegularUser = { _id: mockUserId, role: 'user' };
            mockReq.header.mockReturnValue(`Bearer ${mockToken}`);
            User.findById.mockResolvedValue(mockRegularUser);

            await auth(mockReq, mockRes, nextFunction);
            expect(nextFunction).toHaveBeenCalled();

            nextFunction.mockClear();
            await isAdmin(mockReq, mockRes, nextFunction);
            expect(mockRes.status).toHaveBeenCalledWith(403);
            expect(mockRes.json).toHaveBeenCalledWith({
                error: 'Access denied'
            });
            expect(nextFunction).not.toHaveBeenCalled();
        });
    });
});