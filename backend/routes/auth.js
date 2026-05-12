const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const auth = require('../middleware/auth');


// Public routes
router.post('/register', authController.register);
router.post('/login', authController.login);

// Protected route
router.get('/me', auth, authController.getMe);

module.exports = router;

