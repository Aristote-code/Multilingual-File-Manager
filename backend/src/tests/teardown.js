const mongoose = require('mongoose');
const fs = require('fs').promises;
const path = require('path');

async function cleanupFiles() {
    // Clean up test upload directory
    try {
        await fs.rm('/tmp/test-uploads', { recursive: true, force: true });
    } catch (error) {
        if (error.code !== 'ENOENT') {
            console.error('Error cleaning up test files:', error);
        }
    }
}

async function cleanupDatabase() {
    try {
        // Disconnect from MongoDB
        await mongoose.disconnect();
        
        // Stop MongoDB Memory Server
        if (global.__MONGOD__) {
            await global.__MONGOD__.stop();
        }
    } catch (error) {
        console.error('Error cleaning up database:', error);
        throw error;
    }
}

async function teardown() {
    await Promise.all([
        cleanupFiles(),
        cleanupDatabase()
    ]);
}

module.exports = teardown;