const axios = require('axios');
const {
    API_URL,
    generateTestUser,
    setupTestDB,
    teardownTestDB,
    clearTestDB,
    expectValidationError,
    expectAuthenticationError
} = require('../utils/testHelpers');

describe('Authentication API Integration Tests', () => {
    beforeAll(async () => {
        await setupTestDB();
    });

    afterAll(async () => {
        await teardownTestDB();
    });

    beforeEach(async () => {
        await clearTestDB();
    });

    describe('POST /auth/register', () => {
        it('should successfully register a new user', async () => {
            const testUser = generateTestUser();
            const response = await axios.post(`${API_URL}/auth/register`, testUser);

            expect(response.status).toBe(201);
            expect(response.data.user).toBeDefined();
            expect(response.data.token).toBeDefined();
            expect(response.data.user.email).toBe(testUser.email);
            expect(response.data.user.username).toBe(testUser.username);
            expect(response.data.user.password).toBeUndefined();
        });

        it('should fail with duplicate email', async () => {
            const testUser = generateTestUser();
            await axios.post(`${API_URL}/auth/register`, testUser);

            try {
                await axios.post(`${API_URL}/auth/register`, {
                    ...generateTestUser(),
                    email: testUser.email
                });
            } catch (error) {
                expect(error.response.status).toBe(409);
                expect(error.response.data.error).toMatch(/email.*exists/i);
            }
        });

        it('should fail with invalid email format', async () => {
            try {
                await axios.post(`${API_URL}/auth/register`, {
                    ...generateTestUser(),
                    email: 'invalid-email'
                });
            } catch (error) {
                expectValidationError(error);
                expect(error.response.data.error).toMatch(/email.*invalid/i);
            }
        });

        it('should fail with short password', async () => {
            try {
                await axios.post(`${API_URL}/auth/register`, {
                    ...generateTestUser(),
                    password: '123'
                });
            } catch (error) {
                expectValidationError(error);
                expect(error.response.data.error).toMatch(/password.*length/i);
            }
        });

        it('should fail with missing required fields', async () => {
            try {
                await axios.post(`${API_URL}/auth/register`, {
                    email: 'test@example.com'
                });
            } catch (error) {
                expectValidationError(error);
                expect(error.response.data.error).toMatch(/required/i);
            }
        });
    });

    describe('POST /auth/login', () => {
        let testUser;

        beforeEach(async () => {
            testUser = generateTestUser();
            await axios.post(`${API_URL}/auth/register`, testUser);
        });

        it('should successfully login registered user', async () => {
            const response = await axios.post(`${API_URL}/auth/login`, {
                email: testUser.email,
                password: testUser.password
            });

            expect(response.status).toBe(200);
            expect(response.data.token).toBeDefined();
            expect(response.data.user).toBeDefined();
            expect(response.data.user.email).toBe(testUser.email);
            expect(response.data.user.password).toBeUndefined();
        });

        it('should fail with incorrect password', async () => {
            try {
                await axios.post(`${API_URL}/auth/login`, {
                    email: testUser.email,
                    password: 'wrongpassword'
                });
            } catch (error) {
                expectAuthenticationError(error);
                expect(error.response.data.error).toMatch(/invalid.*credentials/i);
            }
        });

        it('should fail with non-existent email', async () => {
            try {
                await axios.post(`${API_URL}/auth/login`, {
                    email: 'nonexistent@example.com',
                    password: testUser.password
                });
            } catch (error) {
                expect(error.response.status).toBe(404);
                expect(error.response.data.error).toMatch(/not found/i);
            }
        });

        it('should fail with missing credentials', async () => {
            try {
                await axios.post(`${API_URL}/auth/login`, {
                    email: testUser.email
                });
            } catch (error) {
                expectValidationError(error);
                expect(error.response.data.error).toMatch(/required/i);
            }
        });
    });

    describe('GET /auth/profile', () => {
        let authToken;
        let testUser;

        beforeEach(async () => {
            testUser = generateTestUser();
            const registerResponse = await axios.post(`${API_URL}/auth/register`, testUser);
            authToken = registerResponse.data.token;
        });

        it('should get user profile with valid token', async () => {
            const response = await axios.get(`${API_URL}/auth/profile`, {
                headers: { Authorization: `Bearer ${authToken}` }
            });

            expect(response.status).toBe(200);
            expect(response.data.email).toBe(testUser.email);
            expect(response.data.username).toBe(testUser.username);
            expect(response.data.preferredLanguage).toBe(testUser.preferredLanguage);
            expect(response.data.password).toBeUndefined();
        });

        it('should fail with invalid token', async () => {
            try {
                await axios.get(`${API_URL}/auth/profile`, {
                    headers: { Authorization: 'Bearer invalid-token' }
                });
            } catch (error) {
                expectAuthenticationError(error);
            }
        });

        it('should fail with missing token', async () => {
            try {
                await axios.get(`${API_URL}/auth/profile`);
            } catch (error) {
                expectAuthenticationError(error);
            }
        });
    });

    describe('PATCH /auth/profile', () => {
        let authToken;
        let testUser;

        beforeEach(async () => {
            testUser = generateTestUser();
            const registerResponse = await axios.post(`${API_URL}/auth/register`, testUser);
            authToken = registerResponse.data.token;
        });

        it('should update user profile successfully', async () => {
            const updates = {
                username: 'newusername',
                preferredLanguage: 'es'
            };

            const response = await axios.patch(
                `${API_URL}/auth/profile`,
                updates,
                {
                    headers: { Authorization: `Bearer ${authToken}` }
                }
            );

            expect(response.status).toBe(200);
            expect(response.data.username).toBe(updates.username);
            expect(response.data.preferredLanguage).toBe(updates.preferredLanguage);
        });

        it('should fail with invalid language code', async () => {
            try {
                await axios.patch(
                    `${API_URL}/auth/profile`,
                    { preferredLanguage: 'invalid' },
                    {
                        headers: { Authorization: `Bearer ${authToken}` }
                    }
                );
            } catch (error) {
                expectValidationError(error);
                expect(error.response.data.error).toMatch(/language.*invalid/i);
            }
        });

        it('should not allow email update', async () => {
            try {
                await axios.patch(
                    `${API_URL}/auth/profile`,
                    { email: 'newemail@example.com' },
                    {
                        headers: { Authorization: `Bearer ${authToken}` }
                    }
                );
            } catch (error) {
                expectValidationError(error);
                expect(error.response.data.error).toMatch(/email.*not.*allowed/i);
            }
        });
    });
});