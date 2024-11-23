const express = require('express');
const mongoose = require('mongoose');
const i18next = require('i18next');
const passport = require('passport');
const { authRoutes } = require('./routes/auth.routes');
const { fileRoutes } = require('./routes/file.routes');
const { configurePassport } = require('./config/passport');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(passport.initialize());
configurePassport(passport);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/files', fileRoutes);

// Database connection
mongoose.connect('mongodb://localhost/file-manager')
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

// i18n configuration
i18next.init({
  lng: 'en',
  resources: {
    en: require('./locales/en.json'),
    es: require('./locales/es.json')
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});