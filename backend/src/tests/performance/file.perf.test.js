const request = require('supertest');
const fs = require('fs').promises;
const path = require('path');
const { performance } = require('perf_hooks');
const app = require('../../app');

// Test configuration
const TEST_FILE_SIZES = [1, 5, 10]; // File sizes in MB
const CONCURRENT_REQUESTS = 5;
const PERFORMANCE_THRESHOLD = {
    upload: 10000,    // 10 seconds
    download: 3000,  // 3 seconds
    search: 2000,     // 2 seconds
    list: 1000       // 1 second
};

jest.setTimeout(10000); // Set a suite-level timeout of 10 seconds

describe('File Management Performance Tests', () => {
    let authToken;
    let testUploadsDir;

    beforeAll(async () => {
        // Get test token from global setup
        authToken = global.__TEST_TOKEN__;
        if (!authToken) {
            throw new Error('Test token not properly set up');
        }

        testUploadsDir = process.env.TEST_UPLOAD_PATH;
        if (!testUploadsDir) {
            throw new Error('Test upload directory not properly set up');
        }

        // Create test uploads directory if it doesn't exist
        await fs.mkdir(testUploadsDir, { recursive: true });

        console.log('Using auth token:', authToken);
    });

    afterAll(async () => {
        const mongoose = require('mongoose');
        const queueService = require('../../services/queueService');

        // Close database connection
        await mongoose.connection.close();

        // Disconnect Redis client if applicable
        if (queueService.client && queueService.client.disconnect) {
            await queueService.client.disconnect();
        }

        // Clean up test files
        try {
            const files = await fs.readdir(testUploadsDir);
            await Promise.all(
                files.map(file => fs.unlink(path.join(testUploadsDir, file)))
            );
        } catch (error) {
            console.error('Error cleaning up test files:', error);
        }
    });

    describe('Upload Performance', () => {
        const generateTestFile = async (sizeInMB) => {
            const filePath = path.join(testUploadsDir, `test-${sizeInMB}MB.txt`);
            const content = Buffer.alloc(sizeInMB * 1024 * 1024, 'a');
            await fs.writeFile(filePath, content);
            return filePath;
        };

        afterEach(async () => {
            // Cleanup test files
            const testFiles = await fs.readdir(testUploadsDir);
            for (const file of testFiles) {
                if (file.startsWith('test-') && file.endsWith('.txt')) {
                    await fs.unlink(path.join(testUploadsDir, file));
                }
            }
        });

        const testUpload = async (size) => {
            const filePath = await generateTestFile(size);
            try {
                const startTime = performance.now();
                const response = await request(app)
                    .post('/api/files/upload')
                    .set('Authorization', `Bearer ${authToken}`)
                    .attach('file', filePath);

                const duration = performance.now() - startTime;

                expect(response.status).toBe(201);
                expect(duration).toBeLessThan(PERFORMANCE_THRESHOLD.upload);
                console.log(`${size}MB upload took ${duration.toFixed(2)}ms`);
            } finally {
                await fs.unlink(filePath).catch(() => {});
            }
        };

        test('should upload 1MB file within performance threshold', async () => {
            await testUpload(1);
        });

        test('should upload 5MB file within performance threshold', async () => {
            await testUpload(5);
        });

        test('should upload 10MB file within performance threshold', async () => {
            await testUpload(10);
        });

        test('should handle concurrent uploads efficiently', async () => {
            const concurrentUploads = 3;
            const startTime = performance.now();
            
            await Promise.all(Array(concurrentUploads).fill().map(() => testUpload(1)));
            
            const duration = performance.now() - startTime;
            const averageTime = duration / concurrentUploads;
            
            console.log(`Average time per concurrent upload: ${averageTime.toFixed(2)}ms`);
            expect(averageTime).toBeLessThan(PERFORMANCE_THRESHOLD.upload);
        });
    });

    describe('Search Performance', () => {
        beforeAll(async () => {
            // Upload test files for search testing
            const testFiles = Array(10).fill().map((_, index) => ({
                name: `searchtest_${index}.txt`,
                content: `Test content ${index}`
            }));

            for (const file of testFiles) {
                const filePath = path.join(testUploadsDir, file.name);
                try {
                    await fs.writeFile(filePath, file.content);
                    await request(app)
                        .post('/api/files/upload')
                        .set('Authorization', `Bearer ${authToken}`)
                        .attach('file', filePath);
                } finally {
                    await fs.unlink(filePath).catch(() => {});
                }
            }
        });

        test('should perform search within threshold', async () => {
            const startTime = performance.now();
            const response = await request(app)
                .get('/api/files/search')
                .set('Authorization', `Bearer ${authToken}`)
                .query({ q: 'test' });

            const duration = performance.now() - startTime;
            
            expect(response.status).toBe(200);
            expect(duration).toBeLessThan(PERFORMANCE_THRESHOLD.search);
            console.log(`Search operation took ${duration.toFixed(2)}ms`);
        });
    });

    describe('List Files Performance', () => {
        test('should list files within threshold', async () => {
            const startTime = performance.now();
            const response = await request(app)
                .get('/api/files')
                .set('Authorization', `Bearer ${authToken}`);

            const duration = performance.now() - startTime;
            
            expect(response.status).toBe(200);
            expect(duration).toBeLessThan(PERFORMANCE_THRESHOLD.list);
            console.log(`List operation took ${duration.toFixed(2)}ms`);
        });

        test('should handle pagination efficiently', async () => {
            const startTime = performance.now();
            const response = await request(app)
                .get('/api/files')
                .set('Authorization', `Bearer ${authToken}`)
                .query({ page: 1, limit: 10 });

            const duration = performance.now() - startTime;
            
            expect(response.status).toBe(200);
            expect(duration).toBeLessThan(PERFORMANCE_THRESHOLD.list);
            console.log(`Paginated list operation took ${duration.toFixed(2)}ms`);
        });
    });
});