const passport = require('passport');
const { Strategy: JwtStrategy, ExtractJwt } = require('passport-jwt');
const { configurePassport } = require('../../../config/passport');
const { User } = require('../../../models');

jest.mock('passport-jwt');

describe('Passport Configuration Unit Tests', () => {
    let mockJwtStrategy;
    
    beforeEach(() => {
        jest.clearAllMocks();
        mockJwtStrategy = jest.fn();
        JwtStrategy.mockImplementation(mockJwtStrategy);
        ExtractJwt.fromAuthHeaderAsBearerToken = jest.fn().mockReturnValue(() => {});
    });

    describe('Strategy Configuration', () => {
        it('should use Bearer token extraction', () => {
            configurePassport(passport);
            expect(ExtractJwt.fromAuthHeaderAsBearerToken).toHaveBeenCalled();
        });

        it('should use correct JWT secret', () => {
            configurePassport(passport);
            expect(mockJwtStrategy).toHaveBeenCalledWith(
                expect.objectContaining({
                    secretOrKey: process.env.JWT_SECRET
                }),
                expect.any(Function)
            );
        });
    });
});