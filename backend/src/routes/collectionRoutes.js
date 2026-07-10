const express = require('express');
const {
  createCollection,
  listCollections,
  getCollection,
  updateCollection,
  deleteCollection,
} = require('../controllers/collectionController');
const { protect } = require('../middleware/auth');
const asyncHandler = require('../utils/asyncHandler');

const router = express.Router();

router.use(protect);

router.post('/', asyncHandler(createCollection));
router.get('/', asyncHandler(listCollections));
router.get('/:id', asyncHandler(getCollection));
router.put('/:id', asyncHandler(updateCollection));
router.delete('/:id', asyncHandler(deleteCollection));

module.exports = router;
