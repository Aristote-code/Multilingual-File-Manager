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
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Ensure uploads directory has correct permissions
fs.chmodSync(uploadsDir, '755');

// Middleware
app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());
app.use(passport.initialize());
configurePassport(passport);

// Serve static files from uploads directory
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

// MongoDB connection
mongoose.connect('mongodb://127.0.0.1:27017/file-manager')
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => {
    console.error('MongoDB connection error:', err);
    console.log('Please make sure MongoDB is running.');
    process.exit(1);
  });

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});