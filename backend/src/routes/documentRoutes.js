const express = require('express');
const {
  uploadDocument,
  listDocuments,
  getDocumentStatus,
  deleteDocument,
} = require('../controllers/documentController');
const { protect } = require('../middleware/auth');
const { upload } = require('../middleware/upload');
const asyncHandler = require('../utils/asyncHandler');

const router = express.Router();

router.use(protect);

router.post('/upload', upload.single('file'), asyncHandler(uploadDocument));
router.get('/', asyncHandler(listDocuments));
router.get('/:id', asyncHandler(getDocumentStatus));
router.delete('/:id', asyncHandler(deleteDocument));

module.exports = router;
