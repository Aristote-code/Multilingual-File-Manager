const axios = require('axios');
const {
    API_URL,
    setupTestDB,
    teardownTestDB,
    clearTestDB,
    registerTestUser,
    uploadTestFile,
    createTestFile,
    cleanupTestFiles,
    expectValidationError
} = require('../utils/testHelpers');

describe('Internationalization (i18n) API Integration Tests', () => {
    let authToken;
    let testUser;
    let testFilePath;

    beforeAll(async () => {
        await setupTestDB();
        testFilePath = await createTestFile('test.txt', 'Test content');
    });

    afterAll(async () => {
        await teardownTestDB();
        await cleanupTestFiles();
    });

    beforeEach(async () => {
        await clearTestDB();
        const registration = await registerTestUser();
        authToken = registration.token;
        testUser = registration.user;
    });

    describe('GET /i18n/languages', () => {
        it('should list all supported languages', async () => {
            const response = await axios.get(`${API_URL}/i18n/languages`);

            expect(response.status).toBe(200);
            expect(Array.isArray(response.data.languages)).toBe(true);
            expect(response.data.languages.length).toBeGreaterThan(0);
            
            // Verify language object structure
            response.data.languages.forEach(lang => {
                expect(lang).toHaveProperty('code');
                expect(lang).toHaveProperty('name');
                expect(lang).toHaveProperty('nativeName');
                expect(lang).toHaveProperty('isRTL');
            });

            // Verify essential languages are included
            const languageCodes = response.data.languages.map(l => l.code);
            expect(languageCodes).toContain('en');
            expect(languageCodes).toContain('es');
            expect(languageCodes).toContain('zh');
        });

        it('should include RTL language support information', async () => {
            const response = await axios.get(`${API_URL}/i18n/languages`);

            expect(response.status).toBe(200);
            const arabicLang = response.data.languages.find(l => l.code === 'ar');
            expect(arabicLang).toBeDefined();
            expect(arabicLang.isRTL).toBe(true);
        });
    });

    describe('GET /i18n/translations/:lang', () => {
        it('should return translations for valid language code', async () => {
            const response = await axios.get(`${API_URL}/i18n/translations/es`);

            expect(response.status).toBe(200);
            expect(response.data.translations).toBeDefined();
            expect(Object.keys(response.data.translations).length).toBeGreaterThan(0);
        });

        it('should return fallback translations for unsupported language', async () => {
            const response = await axios.get(`${API_URL}/i18n/translations/xx`);

            expect(response.status).toBe(200);
            expect(response.data.translations).toBeDefined();
            expect(response.data.fallback).toBe(true);
            expect(response.data.fallbackLanguage).toBe('en');
        });

        it('should handle special characters in translations', async () => {
            const response = await axios.get(`${API_URL}/i18n/translations/zh`);

            expect(response.status).toBe(200);
            expect(response.data.translations).toBeDefined();
            // Verify Chinese characters are properly encoded
            expect(Object.values(response.data.translations).some(
                value => /[\u4E00-\u9FFF]/.test(value)
            )).toBe(true);
        });
    });

    describe('PATCH /users/language', () => {
        it('should update user preferred language', async () => {
            const response = await axios.patch(
                `${API_URL}/users/language`,
                { language: 'es' },
                { headers: { Authorization: `Bearer ${authToken}` } }
            );

            expect(response.status).toBe(200);
            expect(response.data.preferredLanguage).toBe('es');
        });

        it('should fail with invalid language code', async () => {
            try {
                await axios.patch(
                    `${API_URL}/users/language`,
                    { language: 'invalid' },
                    { headers: { Authorization: `Bearer ${authToken}` } }
                );
            } catch (error) {
                expectValidationError(error);
                expect(error.response.data.error).toMatch(/language.*invalid/i);
            }
        });
    });

    describe('Language-specific API responses', () => {
        it('should return errors in user\'s preferred language', async () => {
            // Set user's preferred language to Spanish
            await axios.patch(
                `${API_URL}/users/language`,
                { language: 'es' },
                { headers: { Authorization: `Bearer ${authToken}` } }
            );

            try {
                await axios.post(
                    `${API_URL}/auth/register`,
                    { email: 'invalid-email' },
                    { headers: { 'Accept-Language': 'es' } }
                );
            } catch (error) {
                expect(error.response.data.error).toMatch(/correo.*inválido/i);
            }
        });

        it('should respect Accept-Language header', async () => {
            try {
                await axios.post(
                    `${API_URL}/auth/register`,
                    { email: 'invalid-email' },
                    { headers: { 'Accept-Language': 'fr' } }
                );
            } catch (error) {
                expect(error.response.data.error).toMatch(/courriel.*invalide/i);
            }
        });

        it('should fallback to English for unsupported languages', async () => {
            try {
                await axios.post(
                    `${API_URL}/auth/register`,
                    { email: 'invalid-email' },
                    { headers: { 'Accept-Language': 'xx' } }
                );
            } catch (error) {
                expect(error.response.data.error).toMatch(/email.*invalid/i);
            }
        });
    });

    describe('File metadata localization', () => {
        let fileId;

        beforeEach(async () => {
            const response = await uploadTestFile(authToken, testFilePath);
            fileId = response.fileId;
        });

        it('should return localized file metadata', async () => {
            const response = await axios.get(
                `${API_URL}/files/${fileId}`,
                {
                    headers: {
                        Authorization: `Bearer ${authToken}`,
                        'Accept-Language': 'es'
                    }
                }
            );

            expect(response.status).toBe(200);
            expect(response.data.metadata.type).toMatch(/archivo de texto/i);
            expect(response.data.metadata.size).toMatch(/bytes/i);
        });

        it('should format dates according to locale', async () => {
            const responses = await Promise.all([
                axios.get(`${API_URL}/files/${fileId}`, {
                    headers: {
                        Authorization: `Bearer ${authToken}`,
                        'Accept-Language': 'en-US'
                    }
                }),
                axios.get(`${API_URL}/files/${fileId}`, {
                    headers: {
                        Authorization: `Bearer ${authToken}`,
                        'Accept-Language': 'de-DE'
                    }
                })
            ]);

            const usDate = responses[0].data.createdAt;
            const deDate = responses[1].data.createdAt;

            expect(usDate).toMatch(/^\d{1,2}\/\d{1,2}\/\d{4}/); // MM/DD/YYYY
            expect(deDate).toMatch(/^\d{1,2}\.\d{1,2}\.\d{4}/); // DD.MM.YYYY
        });
    });

    describe('Search localization', () => {
        beforeEach(async () => {
            // Upload test files with different languages
            const files = [
                await createTestFile('english.txt', 'This is a test file'),
                await createTestFile('spanish.txt', 'Este es un archivo de prueba'),
                await createTestFile('chinese.txt', '这是一个测试文件')
            ];

            for (const file of files) {
                await uploadTestFile(authToken, file);
            }
        });

        it('should support search in different languages', async () => {
            const responses = await Promise.all([
                // English search
                axios.get(`${API_URL}/search`, {
                    headers: { Authorization: `Bearer ${authToken}` },
                    params: { query: 'test', type: 'content' }
                }),
                // Spanish search
                axios.get(`${API_URL}/search`, {
                    headers: { Authorization: `Bearer ${authToken}` },
                    params: { query: 'prueba', type: 'content' }
                }),
                // Chinese search
                axios.get(`${API_URL}/search`, {
                    headers: { Authorization: `Bearer ${authToken}` },
                    params: { query: '测试', type: 'content' }
                })
            ]);

            responses.forEach(response => {
                expect(response.status).toBe(200);
                expect(response.data.results.length).toBeGreaterThan(0);
            });
        });

        it('should return search suggestions in user\'s language', async () => {
            const response = await axios.get(`${API_URL}/search/suggestions`, {
                headers: {
                    Authorization: `Bearer ${authToken}`,
                    'Accept-Language': 'es'
                },
                params: { query: 'pru' }
            });

            expect(response.status).toBe(200);
            expect(response.data.suggestions).toContain('prueba');
        });
    });
});