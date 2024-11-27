/**
 * Performance thresholds for different file operations
 * All values are in milliseconds
 */
const PERFORMANCE_THRESHOLD = {
    // Upload thresholds
    upload: 5000,        // 5 seconds for regular uploads
    uploadLarge: 10000,  // 10 seconds for large file uploads
    concurrent: 15000,   // 15 seconds for concurrent uploads
    
    // Search and list thresholds
    search: 1000,        // 1 second for search operations
    list: 500,          // 0.5 seconds for list operations
    
    // Additional thresholds
    delete: 1000,       // 1 second for delete operations
    update: 2000,       // 2 seconds for update operations
};

// File size constants (in bytes)
const FILE_SIZES = {
    SMALL: 1024 * 1024,     // 1MB
    MEDIUM: 5 * 1024 * 1024, // 5MB
    LARGE: 10 * 1024 * 1024, // 10MB
};

// Test configuration
const TEST_CONFIG = {
    CONCURRENT_UPLOADS: 3,   // Number of concurrent uploads to test
    BATCH_SIZE: 10,         // Number of files in batch operations
    MAX_RETRIES: 3,         // Maximum number of retries for failed operations
};

module.exports = {
    PERFORMANCE_THRESHOLD,
    FILE_SIZES,
    TEST_CONFIG,
};