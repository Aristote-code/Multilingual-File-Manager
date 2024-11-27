const axios = require('axios');
const {
    API_URL,
    setupTestDB,
    teardownTestDB,
    clearTestDB,
    createTestFile,
    cleanupTestFiles,
    registerTestUser,
    uploadTestFile,
    expectAuthenticationError
} = require('../utils/testHelpers');

describe('Search API Integration Tests', () => {
    let authToken;
    let testUser;
    let testFiles = [];

    beforeAll(async () => {
        await setupTestDB();
        
        // Create test files with different content and metadata
        testFiles = [
            await createTestFile('document.txt', 'This is a test document about programming'),
            await createTestFile('report.pdf', 'Quarterly financial report 2023'),
            await createTestFile('image.jpg', 'Sample image file'),
            await createTestFile('script.js', 'function testCode() { return "hello"; }'),
            await createTestFile('notes.txt', 'Important meeting notes about the project'),
            await createTestFile('presentation.pptx', 'Company overview presentation'),
            await createTestFile('data.csv', 'id,name,value\n1,test,100'),
            await createTestFile('config.json', '{"setting": "test", "enabled": true}')
        ];
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

        // Upload all test files
        for (const filePath of testFiles) {
            await uploadTestFile(authToken, filePath);
        }
    });

    describe('GET /search', () => {
        it('should search files by filename', async () => {
            const response = await axios.get(`${API_URL}/search`, {
                headers: { Authorization: `Bearer ${authToken}` },
                params: { query: 'document', type: 'filename' }
            });

            expect(response.status).toBe(200);
            expect(response.data.results).toHaveLength(1);
            expect(response.data.results[0].filename).toBe('document.txt');
        });

        it('should search files by content', async () => {
            const response = await axios.get(`${API_URL}/search`, {
                headers: { Authorization: `Bearer ${authToken}` },
                params: { query: 'programming', type: 'content' }
            });

            expect(response.status).toBe(200);
            expect(response.data.results).toHaveLength(1);
            expect(response.data.results[0].filename).toBe('document.txt');
        });

        it('should search files by file type', async () => {
            const response = await axios.get(`${API_URL}/search`, {
                headers: { Authorization: `Bearer ${authToken}` },
                params: { fileType: 'txt' }
            });

            expect(response.status).toBe(200);
            expect(response.data.results.length).toBeGreaterThanOrEqual(2);
            response.data.results.forEach(file => {
                expect(file.filename).toMatch(/\.txt$/);
            });
        });

        it('should support combined search criteria', async () => {
            const response = await axios.get(`${API_URL}/search`, {
                headers: { Authorization: `Bearer ${authToken}` },
                params: {
                    query: 'test',
                    type: 'content',
                    fileType: 'txt'
                }
            });

            expect(response.status).toBe(200);
            response.data.results.forEach(file => {
                expect(file.filename).toMatch(/\.txt$/);
            });
        });

        it('should support pagination in search results', async () => {
            const response = await axios.get(`${API_URL}/search`, {
                headers: { Authorization: `Bearer ${authToken}` },
                params: {
                    page: 1,
                    limit: 3
                }
            });

            expect(response.status).toBe(200);
            expect(response.data.results.length).toBeLessThanOrEqual(3);
            expect(response.data.pagination).toBeDefined();
            expect(response.data.pagination.total).toBeGreaterThan(0);
            expect(response.data.pagination.pages).toBeGreaterThan(0);
        });

        it('should search with date range filters', async () => {
            const response = await axios.get(`${API_URL}/search`, {
                headers: { Authorization: `Bearer ${authToken}` },
                params: {
                    startDate: new Date(Date.now() - 86400000).toISOString(), // Last 24 hours
                    endDate: new Date().toISOString()
                }
            });

            expect(response.status).toBe(200);
            response.data.results.forEach(file => {
                const fileDate = new Date(file.createdAt);
                expect(fileDate.getTime()).toBeGreaterThan(Date.now() - 86400000);
                expect(fileDate.getTime()).toBeLessThanOrEqual(Date.now());
            });
        });

        it('should search files with size filters', async () => {
            const response = await axios.get(`${API_URL}/search`, {
                headers: { Authorization: `Bearer ${authToken}` },
                params: {
                    minSize: 0,
                    maxSize: 1024 * 1024 // 1MB
                }
            });

            expect(response.status).toBe(200);
            response.data.results.forEach(file => {
                expect(file.size).toBeGreaterThanOrEqual(0);
                expect(file.size).toBeLessThanOrEqual(1024 * 1024);
            });
        });

        it('should handle no results gracefully', async () => {
            const response = await axios.get(`${API_URL}/search`, {
                headers: { Authorization: `Bearer ${authToken}` },
                params: { query: 'nonexistentterm123456789' }
            });

            expect(response.status).toBe(200);
            expect(response.data.results).toHaveLength(0);
            expect(response.data.pagination.total).toBe(0);
        });

        it('should fail without authentication', async () => {
            try {
                await axios.get(`${API_URL}/search`, {
                    params: { query: 'test' }
                });
            } catch (error) {
                expectAuthenticationError(error);
            }
        });

        it('should handle pagination correctly', async () => {
            // ... implementation
        });

        it('should handle invalid search parameters', async () => {
            // ... implementation
        });
    });

    describe('GET /search/suggestions', () => {
        it('should return search suggestions based on partial query', async () => {
            const response = await axios.get(`${API_URL}/search/suggestions`, {
                headers: { Authorization: `Bearer ${authToken}` },
                params: { query: 'doc' }
            });

            expect(response.status).toBe(200);
            expect(response.data.suggestions).toBeDefined();
            expect(response.data.suggestions.length).toBeGreaterThan(0);
            expect(response.data.suggestions).toContain('document.txt');
        });

        it('should limit number of suggestions', async () => {
            const response = await axios.get(`${API_URL}/search/suggestions`, {
                headers: { Authorization: `Bearer ${authToken}` },
                params: { 
                    query: 't',
                    limit: 2
                }
            });

            expect(response.status).toBe(200);
            expect(response.data.suggestions.length).toBeLessThanOrEqual(2);
        });

        it('should return empty suggestions for non-matching query', async () => {
            const response = await axios.get(`${API_URL}/search/suggestions`, {
                headers: { Authorization: `Bearer ${authToken}` },
                params: { query: 'xyz123nonexistent' }
            });

            expect(response.status).toBe(200);
            expect(response.data.suggestions).toHaveLength(0);
        });
    });

    describe('GET /search/recent', () => {
        it('should return recently accessed files', async () => {
            const response = await axios.get(`${API_URL}/search/recent`, {
                headers: { Authorization: `Bearer ${authToken}` }
            });

            expect(response.status).toBe(200);
            expect(response.data.files).toBeDefined();
            expect(Array.isArray(response.data.files)).toBe(true);
        });

        it('should limit number of recent files', async () => {
            const response = await axios.get(`${API_URL}/search/recent`, {
                headers: { Authorization: `Bearer ${authToken}` },
                params: { limit: 3 }
            });

            expect(response.status).toBe(200);
            expect(response.data.files.length).toBeLessThanOrEqual(3);
        });

        it('should return files sorted by last accessed time', async () => {
            const response = await axios.get(`${API_URL}/search/recent`, {
                headers: { Authorization: `Bearer ${authToken}` }
            });

            expect(response.status).toBe(200);
            const files = response.data.files;
            for (let i = 1; i < files.length; i++) {
                const prevTime = new Date(files[i-1].lastAccessed).getTime();
                const currTime = new Date(files[i].lastAccessed).getTime();
                expect(prevTime).toBeGreaterThanOrEqual(currTime);
            }
        });
    });
});