/**
 * Runs the full evaluation suite from the command line.
 *
 * Usage:
 *   node src/scripts/runEval.js          -> runs and prints results
 *   node src/scripts/runEval.js --ci     -> same, but exits(1) if the run fails thresholds
 *
 * Requires MONGO_URI, CHROMA_URL, COHERE_API_KEY, and an LLM provider
 * key to be set (via .env locally, or CI secrets in the workflow).
 */
require('dotenv').config();
const mongoose = require('mongoose');
const config = require('../config/env');
const { runEvaluationSuite } = require('../services/evalRunner');

async function main() {
  const isCI = process.argv.includes('--ci');

  console.log('[eval] connecting to MongoDB...');
  await mongoose.connect(config.mongoUri);

  console.log('[eval] running evaluation suite...');
  const run = await runEvaluationSuite({ triggeredBy: isCI ? 'ci' : 'manual' });

  console.log('\n========== DocMind AI — Evaluation Results ==========');
  console.log(`Faithfulness:       ${run.avgFaithfulness.toFixed(3)}  (threshold: ${run.thresholds.faithfulness})`);
  console.log(`Answer Relevancy:   ${run.avgAnswerRelevancy.toFixed(3)}  (threshold: ${run.thresholds.answerRelevancy})`);
  console.log(`Context Precision:  ${run.avgContextPrecision.toFixed(3)}  (threshold: ${run.thresholds.contextPrecision})`);
  console.log(`Context Recall:     ${run.avgContextRecall.toFixed(3)}  (threshold: ${run.thresholds.contextRecall})`);
  console.log(`Duration:           ${(run.durationMs / 1000).toFixed(1)}s`);
  console.log(`Result:             ${run.passed ? 'PASSED ✅' : 'FAILED ❌'}`);
  console.log('=======================================================\n');

  await mongoose.disconnect();

  if (isCI && !run.passed) {
    console.error('[eval] CI gate failed: scores below configured thresholds.');
    process.exit(1);
  }
  process.exit(0);
}

main().catch((err) => {
  console.error('[eval] fatal error:', err.message);
  process.exit(1);
});
