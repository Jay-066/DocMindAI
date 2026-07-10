const express = require('express');
const {
  listUsers,
  updateUserRole,
  deleteUser,
  getSystemStats,
} = require('../controllers/adminController');
const { protect, adminOnly } = require('../middleware/auth');
const asyncHandler = require('../utils/asyncHandler');

const router = express.Router();

router.use(protect, adminOnly);

router.get('/users', asyncHandler(listUsers));
router.put('/users/:id/role', asyncHandler(updateUserRole));
router.delete('/users/:id', asyncHandler(deleteUser));
router.get('/stats', asyncHandler(getSystemStats));

module.exports = router;
