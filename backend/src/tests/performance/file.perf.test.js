const request = require('supertest');
const { performance } = require('perf_hooks');
const path = require('path');
const fs = require('fs').promises;
const app = require('../../app');
const { PERFORMANCE_THRESHOLD, FILE_SIZES, TEST_CONFIG } = require('./constants');
const mongoose = require('mongoose');
const queueService = require('../../services/queueService');

let server;
let authToken;
let testUploadsDir;

beforeAll(async () => {
    server = app.listen();
    
    // Get token from global setup
    authToken = global.__TEST_TOKEN__;
    if (!authToken) {
        throw new Error('Test token not properly set up');
    }
    console.log('Using auth token:', authToken);

    // Get upload directory from global setup
    testUploadsDir = global.__TEST_UPLOAD_DIR__;
    if (!testUploadsDir) {
        throw new Error('Test upload directory not properly set up');
    }

    // Ensure test upload directory exists
    try {
        await fs.access(testUploadsDir);
    } catch (error) {
        await fs.mkdir(testUploadsDir, { recursive: true });
    }
});

afterAll(async () => {
    await new Promise((resolve) => {
        server.close(() => {
            resolve();
        });
    });
    
    // Close database connection
    await mongoose.connection.close();
    
    // Disconnect Redis client if applicable
    if (queueService.client && queueService.client.disconnect) {
        await queueService.client.disconnect();
    }
    
    // Close any remaining connections
    await new Promise(resolve => setTimeout(resolve, 500));

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

describe('File Management Performance Tests', () => {
    describe('Upload Performance', () => {
        const uploadFile = async (size, filename) => {
            try {
                const fileContent = Buffer.alloc(size * 1024 * 1024).fill('a');
                const startTime = performance.now();
                
                const response = await request(server)
                    .post('/api/files/upload')
                    .set('Authorization', `Bearer ${authToken}`)
                    .attach('file', fileContent, filename);

                const duration = performance.now() - startTime;
                
                expect(response.status).toBe(201);
                expect(duration).toBeLessThan(PERFORMANCE_THRESHOLD.upload);
                console.log(`${size}MB upload took ${duration.toFixed(2)}ms`);
                
                return { duration, response };
            } catch (error) {
                console.error(`Error during ${size}MB upload:`, error.message);
                throw error;
            }
        };

        afterEach(async () => {
            try {
                const testFiles = await fs.readdir(testUploadsDir);
                for (const file of testFiles) {
                    if (file.startsWith('test-') && file.endsWith('.txt')) {
                        await fs.unlink(path.join(testUploadsDir, file));
                    }
                }
            } catch (error) {
                console.error('Error cleaning up test files:', error);
            }
        });

        test('should upload 1MB file within performance threshold', async () => {
            await uploadFile(1, 'test-1mb.txt');
        });

        test('should upload 5MB file within performance threshold', async () => {
            await uploadFile(5, 'test-5mb.txt');
        });

        test('should upload 10MB file within performance threshold', async () => {
            await uploadFile(10, 'test-10mb.txt');
        });

        test('should handle concurrent uploads efficiently', async () => {
            const startTime = performance.now();
            const uploads = Array(TEST_CONFIG.CONCURRENT_UPLOADS).fill(null).map(() => 
                uploadFile(1, `test-concurrent-${Date.now()}.txt`)
            );
            
            await Promise.all(uploads);
            
            const totalDuration = performance.now() - startTime;
            const avgDuration = totalDuration / TEST_CONFIG.CONCURRENT_UPLOADS;
            
            console.log(`Average time per concurrent upload: ${avgDuration.toFixed(2)}ms`);
            expect(avgDuration).toBeLessThan(PERFORMANCE_THRESHOLD.concurrent);
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
                    await request(server)
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
            const response = await request(server)
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
            const response = await request(server)
                .get('/api/files')
                .set('Authorization', `Bearer ${authToken}`);

            const duration = performance.now() - startTime;
            expect(response.status).toBe(200);
            expect(duration).toBeLessThan(PERFORMANCE_THRESHOLD.list);
            console.log(`List operation took ${duration.toFixed(2)}ms`);
        });

        test('should handle pagination efficiently', async () => {
            const startTime = performance.now();
            const response = await request(server)
                .get('/api/files')
                .set('Authorization', `Bearer ${authToken}`)
                .query({ page: 1, limit: TEST_CONFIG.BATCH_SIZE });

            const duration = performance.now() - startTime;
            expect(response.status).toBe(200);
            expect(duration).toBeLessThan(PERFORMANCE_THRESHOLD.list);
            console.log(`Paginated list operation took ${duration.toFixed(2)}ms`);
        });
    });
});