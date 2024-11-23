const Redis = require('redis');
const { promisify } = require('util');

class QueueService {
    constructor() {
        this.client = Redis.createClient(process.env.REDIS_URL);
        
        // Promisify Redis commands
        this.lpush = promisify(this.client.lPush).bind(this.client);
        this.rpop = promisify(this.client.rPop).bind(this.client);
        this.set = promisify(this.client.set).bind(this.client);
        this.get = promisify(this.client.get).bind(this.client);

        this.client.on('error', (err) => console.error('Redis Client Error', err));
        this.client.on('connect', () => console.log('Redis Client Connected'));
    }

    // Add a task to the queue
    async addToQueue(queueName, data) {
        try {
            await this.lpush(queueName, JSON.stringify(data));
            return true;
        } catch (error) {
            console.error('Error adding to queue:', error);
            return false;
        }
    }

    // Process tasks from the queue
    async processQueue(queueName) {
        try {
            const data = await this.rpop(queueName);
            return data ? JSON.parse(data) : null;
        } catch (error) {
            console.error('Error processing queue:', error);
            return null;
        }
    }

    // Set progress for a task
    async setProgress(taskId, progress) {
        try {
            await this.set(`progress:${taskId}`, progress.toString());
            return true;
        } catch (error) {
            console.error('Error setting progress:', error);
            return false;
        }
    }

    // Get progress for a task
    async getProgress(taskId) {
        try {
            const progress = await this.get(`progress:${taskId}`);
            return progress ? parseInt(progress) : 0;
        } catch (error) {
            console.error('Error getting progress:', error);
            return 0;
        }
    }
}

module.exports = new QueueService();