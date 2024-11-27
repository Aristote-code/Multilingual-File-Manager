const axios = require('axios');
const path = require('path');
const {
    API_URL,
    generateTestUser,
    setupTestDB,
    teardownTestDB,
    clearTestDB,
    createTestFile,
    cleanupTestFiles,
    registerTestUser,
    uploadTestFile,
    expectAuthenticationError,
    expectAuthorizationError,
    expectNotFoundError
} = require('../utils/testHelpers');

describe('File Management API Integration Tests', () => {
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

    describe('POST /files/upload', () => {
        it('should successfully upload a file', async () => {
            const response = await uploadTestFile(authToken, testFilePath);

            expect(response.status).toBe(201);
            expect(response.fileId).toBeDefined();
            expect(response.taskId).toBeDefined();
            expect(response.status).toBe('processing');
        });

        it('should fail without authentication', async () => {
            try {
                await uploadTestFile('invalid-token', testFilePath);
            } catch (error) {
                expectAuthenticationError(error);
            }
        });

        it('should fail with invalid file type', async () => {
            const invalidFilePath = await createTestFile('test.exe', 'Invalid content');
            try {
                await uploadTestFile(authToken, invalidFilePath);
            } catch (error) {
                expect(error.response.status).toBe(400);
                expect(error.response.data.error).toMatch(/file type.*not allowed/i);
            }
        });

        it('should fail when file size exceeds limit', async () => {
            const largePath = await createTestFile('large.txt', 'x'.repeat(1024 * 1024 * 11)); // 11MB
            try {
                await uploadTestFile(authToken, largePath);
            } catch (error) {
                expect(error.response.status).toBe(413);
                expect(error.response.data.error).toMatch(/file.*too large/i);
            }
        });
    });

    describe('GET /files', () => {
        let uploadedFiles = [];

        beforeEach(async () => {
            // Upload multiple test files
            for (let i = 0; i < 5; i++) {
                const filePath = await createTestFile(`test${i}.txt`, `Content ${i}`);
                const response = await uploadTestFile(authToken, filePath);
                uploadedFiles.push(response.fileId);
            }
        });

        it('should list user files with pagination', async () => {
            const response = await axios.get(`${API_URL}/files`, {
                headers: { Authorization: `Bearer ${authToken}` },
                params: { page: 1, limit: 3 }
            });

            expect(response.status).toBe(200);
            expect(response.data.files).toHaveLength(3);
            expect(response.data.pagination.total).toBe(5);
            expect(response.data.pagination.pages).toBe(2);
        });

        it('should sort files correctly', async () => {
            const response = await axios.get(`${API_URL}/files`, {
                headers: { Authorization: `Bearer ${authToken}` },
                params: { sort: 'name', order: 'asc' }
            });

            expect(response.status).toBe(200);
            const fileNames = response.data.files.map(f => f.filename);
            expect(fileNames).toEqual([...fileNames].sort());
        });

        it('should filter files by type', async () => {
            const response = await axios.get(`${API_URL}/files`, {
                headers: { Authorization: `Bearer ${authToken}` },
                params: { type: 'txt' }
            });

            expect(response.status).toBe(200);
            response.data.files.forEach(file => {
                expect(file.filename).toMatch(/\.txt$/);
            });
        });
    });

    describe('GET /files/:id', () => {
        let uploadedFileId;

        beforeEach(async () => {
            const response = await uploadTestFile(authToken, testFilePath);
            uploadedFileId = response.fileId;
        });

        it('should get file details', async () => {
            const response = await axios.get(`${API_URL}/files/${uploadedFileId}`, {
                headers: { Authorization: `Bearer ${authToken}` }
            });

            expect(response.status).toBe(200);
            expect(response.data.id).toBe(uploadedFileId);
            expect(response.data.filename).toBeDefined();
            expect(response.data.size).toBeGreaterThan(0);
            expect(response.data.owner.id).toBe(testUser.id);
        });

        it('should fail with non-existent file', async () => {
            try {
                await axios.get(`${API_URL}/files/nonexistentid`, {
                    headers: { Authorization: `Bearer ${authToken}` }
                });
            } catch (error) {
                expectNotFoundError(error);
            }
        });

        it('should fail when accessing another user\'s private file', async () => {
            const otherUser = await registerTestUser('other');
            try {
                await axios.get(`${API_URL}/files/${uploadedFileId}`, {
                    headers: { Authorization: `Bearer ${otherUser.token}` }
                });
            } catch (error) {
                expectAuthorizationError(error);
            }
        });
    });

    describe('DELETE /files/:id', () => {
        let uploadedFileId;

        beforeEach(async () => {
            const response = await uploadTestFile(authToken, testFilePath);
            uploadedFileId = response.fileId;
        });

        it('should delete file successfully', async () => {
            const response = await axios.delete(`${API_URL}/files/${uploadedFileId}`, {
                headers: { Authorization: `Bearer ${authToken}` }
            });

            expect(response.status).toBe(204);

            // Verify file is deleted
            try {
                await axios.get(`${API_URL}/files/${uploadedFileId}`, {
                    headers: { Authorization: `Bearer ${authToken}` }
                });
            } catch (error) {
                expectNotFoundError(error);
            }
        });

        it('should fail to delete another user\'s file', async () => {
            const otherUser = await registerTestUser('other');
            try {
                await axios.delete(`${API_URL}/files/${uploadedFileId}`, {
                    headers: { Authorization: `Bearer ${otherUser.token}` }
                });
            } catch (error) {
                expectAuthorizationError(error);
            }
        });
    });

    describe('PATCH /files/:id/share', () => {
        let uploadedFileId;
        let otherUser;

        beforeEach(async () => {
            const response = await uploadTestFile(authToken, testFilePath);
            uploadedFileId = response.fileId;
            otherUser = await registerTestUser('other');
        });

        it('should share file with another user', async () => {
            const response = await axios.patch(
                `${API_URL}/files/${uploadedFileId}/share`,
                {
                    userId: otherUser.user.id,
                    permission: 'read'
                },
                {
                    headers: { Authorization: `Bearer ${authToken}` }
                }
            );

            expect(response.status).toBe(200);
            expect(response.data.sharedWith).toContainEqual({
                user: otherUser.user.id,
                permission: 'read'
            });
        });

        it('should update sharing permissions', async () => {
            // First share with read permission
            await axios.patch(
                `${API_URL}/files/${uploadedFileId}/share`,
                {
                    userId: otherUser.user.id,
                    permission: 'read'
                },
                {
                    headers: { Authorization: `Bearer ${authToken}` }
                }
            );

            // Update to write permission
            const response = await axios.patch(
                `${API_URL}/files/${uploadedFileId}/share`,
                {
                    userId: otherUser.user.id,
                    permission: 'write'
                },
                {
                    headers: { Authorization: `Bearer ${authToken}` }
                }
            );

            expect(response.status).toBe(200);
            expect(response.data.sharedWith).toContainEqual({
                user: otherUser.user.id,
                permission: 'write'
            });
        });

        it('should remove sharing when permission is none', async () => {
            // First share the file
            await axios.patch(
                `${API_URL}/files/${uploadedFileId}/share`,
                {
                    userId: otherUser.user.id,
                    permission: 'read'
                },
                {
                    headers: { Authorization: `Bearer ${authToken}` }
                }
            );

            // Remove sharing
            const response = await axios.patch(
                `${API_URL}/files/${uploadedFileId}/share`,
                {
                    userId: otherUser.user.id,
                    permission: 'none'
                },
                {
                    headers: { Authorization: `Bearer ${authToken}` }
                }
            );

            expect(response.status).toBe(200);
            expect(response.data.sharedWith).not.toContainEqual(
                expect.objectContaining({ user: otherUser.user.id })
            );
        });
    });
});