const express = require('express');
const router = express.Router();
const { auth } = require('../middlewares/auth');
const userController = require('../controllers/userController');
const { body } = require('express-validator');

// Validation middleware
const validateRegistration = [
    body('username').trim().isLength({ min: 3 }).escape(),
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 6 }),
    body('preferredLanguage').optional().isIn(['en', 'fr', 'rw', 'sw'])
];

// Public routes
router.post('/register', validateRegistration, userController.register);
router.post('/login', userController.login);

// Protected routes
router.get('/profile', auth, userController.getProfile);
router.put('/profile', auth, userController.updateProfile);

module.exports = router;