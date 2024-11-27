const {
    validateEmail,
    validatePassword,
    validateUsername,
    validateLanguage,
    validateFileSize,
    validateFileType
} = require('../../../utils/validators');

describe('Validators Unit Tests', () => {
    describe('validateEmail', () => {
        it('should validate correct email format', () => {
            expect(validateEmail('test@example.com')).toBe(true);
            expect(validateEmail('user.name+tag@domain.co.uk')).toBe(true);
        });

        it('should reject invalid email format', () => {
            expect(validateEmail('invalid')).toBe(false);
            expect(validateEmail('test@')).toBe(false);
            expect(validateEmail('@domain.com')).toBe(false);
            expect(validateEmail('test@domain')).toBe(false);
        });

        it('should handle empty or null input', () => {
            expect(validateEmail('')).toBe(false);
            expect(validateEmail(null)).toBe(false);
            expect(validateEmail(undefined)).toBe(false);
        });
    });

    describe('validatePassword', () => {
        it('should validate password meeting requirements', () => {
            expect(validatePassword('Password123!')).toBe(true);
            expect(validatePassword('SecurePass1')).toBe(true);
        });

        it('should reject too short passwords', () => {
            expect(validatePassword('Pass1')).toBe(false);
        });

        it('should reject passwords missing required characters', () => {
            expect(validatePassword('onlylowercase')).toBe(false);
            expect(validatePassword('ONLYUPPERCASE')).toBe(false);
            expect(validatePassword('12345678')).toBe(false);
        });

        it('should handle empty or null input', () => {
            expect(validatePassword('')).toBe(false);
            expect(validatePassword(null)).toBe(false);
            expect(validatePassword(undefined)).toBe(false);
        });
    });

    describe('validateUsername', () => {
        it('should validate correct username format', () => {
            expect(validateUsername('john_doe')).toBe(true);
            expect(validateUsername('user123')).toBe(true);
        });

        it('should reject usernames with special characters', () => {
            expect(validateUsername('user@name')).toBe(false);
            expect(validateUsername('user#123')).toBe(false);
        });

        it('should reject too short or too long usernames', () => {
            expect(validateUsername('ab')).toBe(false);
            expect(validateUsername('a'.repeat(31))).toBe(false);
        });

        it('should handle empty or null input', () => {
            expect(validateUsername('')).toBe(false);
            expect(validateUsername(null)).toBe(false);
            expect(validateUsername(undefined)).toBe(false);
        });
    });

    describe('validateLanguage', () => {
        it('should validate supported languages', () => {
            expect(validateLanguage('en')).toBe(true);
            expect(validateLanguage('fr')).toBe(true);
            expect(validateLanguage('rw')).toBe(true);
            expect(validateLanguage('sw')).toBe(true);
        });

        it('should reject unsupported languages', () => {
            expect(validateLanguage('es')).toBe(false);
            expect(validateLanguage('de')).toBe(false);
        });

        it('should handle empty or null input', () => {
            expect(validateLanguage('')).toBe(false);
            expect(validateLanguage(null)).toBe(false);
            expect(validateLanguage(undefined)).toBe(false);
        });
    });

    describe('validateFileSize', () => {
        it('should validate files within size limit', () => {
            const maxSize = 10 * 1024 * 1024; // 10MB
            expect(validateFileSize(1024, maxSize)).toBe(true);
            expect(validateFileSize(maxSize, maxSize)).toBe(true);
        });

        it('should reject files exceeding size limit', () => {
            const maxSize = 10 * 1024 * 1024;
            expect(validateFileSize(maxSize + 1, maxSize)).toBe(false);
        });

        it('should handle invalid sizes', () => {
            const maxSize = 10 * 1024 * 1024;
            expect(validateFileSize(-1, maxSize)).toBe(false);
            expect(validateFileSize(0, maxSize)).toBe(false);
            expect(validateFileSize(null, maxSize)).toBe(false);
        });
    });

    describe('validateFileType', () => {
        it('should validate allowed file types', () => {
            expect(validateFileType('image/jpeg')).toBe(true);
            expect(validateFileType('image/png')).toBe(true);
            expect(validateFileType('application/pdf')).toBe(true);
            expect(validateFileType('text/plain')).toBe(true);
        });

        it('should reject unsupported file types', () => {
            expect(validateFileType('application/exe')).toBe(false);
            expect(validateFileType('application/x-msdownload')).toBe(false);
        });

        it('should handle empty or null input', () => {
            expect(validateFileType('')).toBe(false);
            expect(validateFileType(null)).toBe(false);
            expect(validateFileType(undefined)).toBe(false);
        });
    });
});