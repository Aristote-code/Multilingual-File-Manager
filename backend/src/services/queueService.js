const Redis = require('ioredis');

class QueueService {
    constructor() {
        this.client = null;
        this.isConnected = false;
    }

    async connect() {
        if (!this.isConnected) {
            try {
                this.client = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
                    maxRetriesPerRequest: 3,
                    enableReadyCheck: true,
                    retryStrategy: (times) => {
                        return Math.min(times * 50, 2000);
                    }
                });

                this.client.on('error', (err) => {
                    console.error('Redis connection error:', err);
                    this.isConnected = false;
                });

                this.client.on('connect', () => {
                    this.isConnected = true;
                });

                await this.client.ping();
                this.isConnected = true;
            } catch (error) {
                console.error('Failed to connect to Redis:', error);
                throw error;
            }
        }
    }

    async addToQueue(queueName, data) {
        try {
            if (!this.isConnected) {
                await this.connect();
            }
            await this.client.lpush(queueName, JSON.stringify(data));
            return true;
        } catch (error) {
            console.error('Error adding to queue:', error);
            return false;
        }
    }

    async getFromQueue(queueName) {
        try {
            if (!this.isConnected) {
                await this.connect();
            }
            const data = await this.client.rpop(queueName);
            return data ? JSON.parse(data) : null;
        } catch (error) {
            console.error('Error getting from queue:', error);
            return null;
        }
    }

    async disconnect() {
        if (this.client && this.isConnected) {
            await this.client.quit();
            this.isConnected = false;
        }
    }

    // Set progress for a task
    async setProgress(taskId, progress) {
        try {
            if (!this.isConnected) {
                await this.connect();
            }
            await this.client.set(`progress:${taskId}`, progress.toString());
            return true;
        } catch (error) {
            console.error('Error setting progress:', error);
            return false;
        }
    }

    // Get progress for a task
    async getProgress(taskId) {
        try {
            if (!this.isConnected) {
                await this.connect();
            }
            const progress = await this.client.get(`progress:${taskId}`);
            return progress ? parseInt(progress) : 0;
        } catch (error) {
            console.error('Error getting progress:', error);
            return 0;
        }
    }
}

// Export a singleton instance
const queueService = new QueueService();
module.exports = queueService;