const EvalRun = require('../models/EvalRun');
const { runEvaluationSuite } = require('../services/evalRunner');

/**
 * POST /api/eval/run
 * Triggers a manual evaluation run against the default eval dataset
 * (optionally scoped to a collection) and stores the result.
 */
async function triggerEvalRun(req, res) {
  const { collectionId } = req.body;
  const result = await runEvaluationSuite({ triggeredBy: 'manual', collectionId });
  res.status(201).json({ evalRun: result });
}

/**
 * GET /api/eval/runs
 * Returns recent eval runs for the dashboard, most recent first.
 */
async function listEvalRuns(req, res) {
  const runs = await EvalRun.find()
    .sort({ createdAt: -1 })
    .limit(20)
    .select('-caseResults'); // omit heavy per-case detail in the list view
  res.json({ runs });
}

/**
 * GET /api/eval/runs/:id
 * Full detail for a single run, including per-case scores.
 */
async function getEvalRun(req, res) {
  const run = await EvalRun.findById(req.params.id);
  if (!run) {
    return res.status(404).json({ error: 'Eval run not found' });
  }
  res.json({ run });
}

/**
 * GET /api/eval/latest
 * Convenience endpoint: just the most recent run's aggregate scores,
 * used to populate the real-time stats panel on load.
 */
async function getLatestEvalRun(req, res) {
  const run = await EvalRun.findOne().sort({ createdAt: -1 }).select('-caseResults');
  res.json({ run: run || null });
}

/**
 * DELETE /api/eval/runs/:id
 * Removes a single eval run from history.
 */
async function deleteEvalRun(req, res) {
  const run = await EvalRun.findById(req.params.id);
  if (!run) {
    return res.status(404).json({ error: 'Eval run not found' });
  }
  await run.deleteOne();
  res.json({ message: 'Eval run deleted' });
}

module.exports = { triggerEvalRun, listEvalRuns, getEvalRun, getLatestEvalRun, deleteEvalRun };