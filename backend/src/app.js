const express = require('express');
const cors = require('cors');
const i18n = require('i18n');
const path = require('path');
const passport = require('passport');
const { connectDB } = require('./config/database');
require('./config/passport');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(passport.initialize());

// i18n configuration
i18n.configure({
    locales: ['en', 'fr', 'rw', 'sw'],
    directory: path.join(__dirname, 'locales'),
    defaultLocale: 'en',
    objectNotation: true
});
app.use(i18n.init);

// Routes
app.use('/api/users', require('./routes/user.routes'));
app.use('/api/files', require('./routes/file.routes'));

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something went wrong!' });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Not found' });
});

module.exports = app;