const express = require('express');
const { getPublicStats } = require('../controllers/publicStatsController');
const asyncHandler = require('../utils/asyncHandler');

const router = express.Router();

router.get('/stats', asyncHandler(getPublicStats));

module.exports = router;