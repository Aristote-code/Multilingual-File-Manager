require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const i18next = require('i18next');
const passport = require('passport');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { authRoutes } = require('./routes/auth.routes');
const { fileRoutes } = require('./routes/file.routes');
const { configurePassport } = require('./config/passport');

const app = express();
const PORT = process.env.PORT || 3001; // Changed to 3001 to avoid conflict with Vite

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Middleware
app.use(cors({
  origin: 'http://localhost:5173', // Vite's default port
  credentials: true
}));
app.use(express.json());
app.use(passport.initialize());
configurePassport(passport);

// Static files
app.use('/uploads', express.static(uploadsDir));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/files', fileRoutes);

// i18n configuration
i18next.init({
  lng: 'en',
  resources: {
    en: require('./locales/en.json'),
    es: require('./locales/es.json')
  }
});

// Use MongoDB in-memory for development
mongoose.connect('mongodb://127.0.0.1:27017/file-manager')
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => {
    console.log('MongoDB connection error. Please make sure MongoDB is running.');
    process.exit(1);
  });

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});