require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const i18next = require('i18next');
const passport = require('passport');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const authRoutes = require('./routes/auth.routes');
const fileRoutes = require('./routes/file.routes');
const { configurePassport } = require('./config/passport');

const app = express();
const PORT = process.env.PORT || 3001;

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, '../', process.env.UPLOAD_DIR || 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Middleware setup
app.use(cors({
  origin: process.env.NODE_ENV === 'test' ? '*' : 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());
app.use(passport.initialize());
configurePassport(passport);

app.use('/uploads', express.static(uploadsDir));
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

// MongoDB connection
const connectDB = async () => {
  try {
    if (!mongoose.connection.readyState) {
      const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/file-manager';
      await mongoose.connect(mongoUri);
      if (process.env.NODE_ENV !== 'test') {
        console.log('Connected to MongoDB');
      }
    }
  } catch (err) {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  }
};

// Only start the server if we're not in a test environment
if (process.env.NODE_ENV !== 'test') {
  connectDB().then(() => {
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  });
}

module.exports = { app, connectDB }; // Export both app and connectDB