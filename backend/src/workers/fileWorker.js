const queueService = require('../services/queueService');
const File = require('../models/File');
const path = require('path');
const fs = require('fs').promises;
const crypto = require('crypto');

const QUEUE_NAME = 'file-processing';

async function processFile(fileData) {
    try {
        const { originalPath, userId, originalName, mimetype, size } = fileData;
        const taskId = crypto.randomBytes(16).toString('hex');

        // Update progress to 10% - Started processing
        await queueService.setProgress(taskId, 10);

        // Read the file
        const fileBuffer = await fs.readFile(originalPath);
        await queueService.setProgress(taskId, 30);

        // Generate unique filename
        const filename = crypto.randomBytes(16).toString('hex') + path.extname(originalName);
        const destinationPath = path.join(process.env.FILE_UPLOAD_PATH || 'uploads/', filename);

        // Write to destination
        await fs.writeFile(destinationPath, fileBuffer);
        await queueService.setProgress(taskId, 60);

        // Create file record in database
        const file = new File({
            filename,
            originalName,
            path: destinationPath,
            size,
            mimetype,
            owner: userId
        });

        await file.save();
        await queueService.setProgress(taskId, 90);

        // Delete original file
        await fs.unlink(originalPath);
        await queueService.setProgress(taskId, 100);

        return { success: true, fileId: file._id };
    } catch (error) {
        console.error('Error processing file:', error);
        return { success: false, error: error.message };
    }
}

async function startWorker() {
    console.log('File processing worker started');
    
    while (true) {
        try {
            // Get next task from queue
            const task = await queueService.processQueue(QUEUE_NAME);
            
            if (task) {
                console.log('Processing file:', task.originalName);
                await processFile(task);
            } else {
                // Wait for 1 second before checking queue again
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        } catch (error) {
            console.error('Worker error:', error);
            // Wait before retrying
            await new Promise(resolve => setTimeout(resolve, 5000));
        }
    }
}

// Start the worker if this file is run directly
if (require.main === module) {
    startWorker();
}

module.exports = {
    processFile,
    startWorker
};