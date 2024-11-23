const express = require('express');
const cors = require('cors');
const path = require('path');
const connectDB = require('./config/database');
require('dotenv').config();

// Initialize express
const app = express();

// Connect to MongoDB
connectDB();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Create uploads directory if it doesn't exist
const uploadDir = process.env.FILE_UPLOAD_PATH || 'uploads/';
require('fs').mkdirSync(uploadDir, { recursive: true });

// Serve static files from uploads directory
app.use('/uploads', express.static(path.join(__dirname, '..', uploadDir)));

// Routes
app.use('/api/users', require('./routes/user.routes'));
app.use('/api/files', require('./routes/file.routes'));

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something broke!' });
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});