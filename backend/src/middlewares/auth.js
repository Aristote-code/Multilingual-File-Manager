const jwt = require('jsonwebtoken');
const User = require('../models/User');

const auth = async (req, res, next) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');
        
        if (!token) {
            throw new Error('Authentication required');
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        if (!decoded.userId) {
            throw new Error('Invalid token structure');
        }

        // Add timeout for database query
        const user = await Promise.race([
            User.findById(decoded.userId),
            new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Database query timeout')), 5000)
            )
        ]);

        if (!user) {
            throw new Error('User not found');
        }

        // Attach user and token to request
        req.user = user;
        req.token = token;
        next();
    } catch (error) {
        console.error('Authentication error:', error.message);
        
        // More specific error messages
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({ error: 'Invalid token' });
        }
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ error: 'Token expired' });
        }
        if (error.message === 'Database query timeout') {
            return res.status(503).json({ error: 'Service temporarily unavailable' });
        }
        
        res.status(401).json({ error: 'Please authenticate' });
    }
};

const isAdmin = async (req, res, next) => {
    try {
        if (!req.user) {
            throw new Error('User not authenticated');
        }
        if (req.user.role !== 'admin') {
            throw new Error('Admin access required');
        }
        next();
    } catch (error) {
        res.status(403).json({ error: 'Access denied' });
    }
};

module.exports = { auth, isAdmin };