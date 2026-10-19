const express = require('express');
const { register, login, googleAuth, authConfig, getMe } = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const asyncHandler = require('../utils/asyncHandler');

const router = express.Router();

router.post('/register', asyncHandler(register));
router.post('/login', asyncHandler(login));
router.post('/google', asyncHandler(googleAuth));
router.get('/config', asyncHandler(authConfig));
router.get('/me', protect, asyncHandler(getMe));

module.exports = router;
