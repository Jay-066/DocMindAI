const express = require('express');
const {
  triggerEvalRun,
  listEvalRuns,
  getEvalRun,
  getLatestEvalRun,
  deleteEvalRun,
} = require('../controllers/evalController');
const { protect } = require('../middleware/auth');
const asyncHandler = require('../utils/asyncHandler');

const router = express.Router();

router.use(protect);

router.post('/run', asyncHandler(triggerEvalRun));
router.get('/runs', asyncHandler(listEvalRuns));
router.get('/runs/:id', asyncHandler(getEvalRun));
router.get('/latest', asyncHandler(getLatestEvalRun));
router.delete('/runs/:id', asyncHandler(deleteEvalRun));

module.exports = router;