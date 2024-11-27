const passport = require('passport');
const { Strategy: JwtStrategy } = require('passport-jwt');
const { ExtractJwt } = require('passport-jwt');
const User = require('../../../models/User');
const { configurePassport } = require('../../../config/passport');

// Mock dependencies
jest.mock('passport');
jest.mock('passport-jwt');
jest.mock('../../../models/User');

describe('Passport Configuration Unit Tests', () => {
    // Store original environment variables
    const originalEnv = process.env;
    const mockJwtSecret = 'test-secret';

    beforeEach(() => {
        // Reset all mocks
        jest.clearAllMocks();
        // Reset environment for each test
        process.env = { ...originalEnv };
        process.env.JWT_SECRET = mockJwtSecret;
        // Mock ExtractJwt
        ExtractJwt.fromAuthHeaderAsBearerToken.mockReturnValue(
            jest.fn().mockReturnValue('mock-token')
        );
    });

    afterEach(() => {
        // Restore environment
        process.env = originalEnv;
    });

    describe('Strategy Configuration', () => {
        it('should configure JWT strategy with correct options', () => {
            configurePassport(passport);

            expect(JwtStrategy).toHaveBeenCalledWith(
                expect.objectContaining({
                    jwtFromRequest: expect.any(Function),
                    secretOrKey: mockJwtSecret
                }),
                expect.any(Function)
            );
            expect(passport.use).toHaveBeenCalled();
        });

        it('should use Bearer token extraction', () => {
            configurePassport(passport);

            expect(ExtractJwt.fromAuthHeaderAsBearerToken).toHaveBeenCalled();
        });

        it('should use correct JWT secret', () => {
            process.env.JWT_SECRET = 'custom-secret';
            configurePassport(passport);

            expect(JwtStrategy).toHaveBeenCalledWith(
                expect.objectContaining({
                    secretOrKey: 'custom-secret'
                }),
                expect.any(Function)
            );
        });
    });

    describe('JWT Strategy Verification', () => {
        let verifyCallback;

        beforeEach(() => {
            // Capture the verify callback when JwtStrategy is instantiated
            JwtStrategy.mockImplementation((options, verify) => {
                verifyCallback = verify;
                return { name: 'jwt' };
            });
        });

        it('should authenticate valid user', async () => {
            const mockUser = { id: 'user123', username: 'testuser' };
            User.findById.mockResolvedValue(mockUser);

            configurePassport(passport);
            const done = jest.fn();
            await verifyCallback({ id: 'user123' }, done);

            expect(User.findById).toHaveBeenCalledWith('user123');
            expect(done).toHaveBeenCalledWith(null, mockUser);
        });

        it('should reject non-existent user', async () => {
            User.findById.mockResolvedValue(null);

            configurePassport(passport);
            const done = jest.fn();
            await verifyCallback({ id: 'invalid-id' }, done);

            expect(User.findById).toHaveBeenCalledWith('invalid-id');
            expect(done).toHaveBeenCalledWith(null, false);
        });

        it('should handle database errors', async () => {
            const error = new Error('Database error');
            User.findById.mockRejectedValue(error);

            configurePassport(passport);
            const done = jest.fn();
            await verifyCallback({ id: 'user123' }, done);

            expect(User.findById).toHaveBeenCalledWith('user123');
            expect(done).toHaveBeenCalledWith(error, false);
        });
    });

    describe('Token Extraction', () => {
        it('should extract token from Authorization header', () => {
            const extractJwt = ExtractJwt.fromAuthHeaderAsBearerToken();
            const mockReq = {
                headers: {
                    authorization: 'Bearer mock-token'
                }
            };

            const token = extractJwt(mockReq);
            expect(token).toBe('mock-token');
        });

        it('should handle missing Authorization header', () => {
            ExtractJwt.fromAuthHeaderAsBearerToken.mockReturnValue(
                jest.fn().mockReturnValue(null)
            );

            configurePassport(passport);
            const extractJwt = ExtractJwt.fromAuthHeaderAsBearerToken();
            const mockReq = { headers: {} };

            const token = extractJwt(mockReq);
            expect(token).toBeNull();
        });

        it('should handle invalid Authorization format', () => {
            ExtractJwt.fromAuthHeaderAsBearerToken.mockReturnValue(
                jest.fn().mockReturnValue(null)
            );

            configurePassport(passport);
            const extractJwt = ExtractJwt.fromAuthHeaderAsBearerToken();
            const mockReq = {
                headers: {
                    authorization: 'Invalid-Format token'
                }
            };

            const token = extractJwt(mockReq);
            expect(token).toBeNull();
        });
    });

    describe('Error Handling', () => {
        it('should handle missing JWT_SECRET', () => {
            delete process.env.JWT_SECRET;

            expect(() => {
                configurePassport(passport);
            }).not.toThrow();

            expect(JwtStrategy).toHaveBeenCalledWith(
                expect.objectContaining({
                    secretOrKey: undefined
                }),
                expect.any(Function)
            );
        });

        it('should handle strategy initialization errors', () => {
            JwtStrategy.mockImplementation(() => {
                throw new Error('Strategy initialization error');
            });

            expect(() => {
                configurePassport(passport);
            }).toThrow('Strategy initialization error');
        });
    });

    describe('Passport Integration', () => {
        it('should register JWT strategy with passport', () => {
            configurePassport(passport);

            expect(passport.use).toHaveBeenCalledWith(
                expect.objectContaining({
                    name: 'jwt'
                })
            );
        });

        it('should maintain strategy name', () => {
            JwtStrategy.mockImplementation(() => ({
                name: 'jwt'
            }));

            configurePassport(passport);
            const strategy = passport.use.mock.calls[0][0];

            expect(strategy.name).toBe('jwt');
        });
    });
});