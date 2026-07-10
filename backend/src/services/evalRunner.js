const fs = require('fs');
const path = require('path');
const config = require('../config/env');
const EvalRun = require('../models/EvalRun');
const Collection = require('../models/Collection');
const { hybridRetrieve } = require('./retrieval');
const { generate } = require('./generation');
const { evaluateResponse } = require('./ragas');

const DEFAULT_DATASET_PATH = path.join(__dirname, '..', 'evalDataset.json');

// Change this number to evaluate more/fewer questions.
const MAX_EVAL_CASES = 2;

function loadDataset() {
  if (!fs.existsSync(DEFAULT_DATASET_PATH)) {
    throw new Error(`Eval dataset not found at ${DEFAULT_DATASET_PATH}`);
  }

  const raw = fs.readFileSync(DEFAULT_DATASET_PATH, 'utf8');
  const dataset = JSON.parse(raw);

  return dataset.slice(0, MAX_EVAL_CASES);
}

function average(nums) {
  if (nums.length === 0) return 0;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

async function runEvaluationSuite({
  triggeredBy = 'manual',
  collectionId = null,
} = {}) {
  const startTime = Date.now();

  const dataset = loadDataset();

  let targetCollectionId = collectionId;

  if (!targetCollectionId) {
    const anyCollection = await Collection.findOne().sort({ createdAt: 1 });

    if (!anyCollection) {
      throw new Error(
        'No collection available to evaluate against. Seed a collection with documents first.'
      );
    }

    targetCollectionId = anyCollection._id;
  }

  const caseResults = [];

  console.log(`\nRunning evaluation on ${dataset.length} question(s)...\n`);

  for (let i = 0; i < dataset.length; i++) {
    const item = dataset[i];

    console.log(`Evaluating ${i + 1}/${dataset.length}: ${item.question}`);

    const chunks = await hybridRetrieve(targetCollectionId, item.question);

    // Use the same set of reranked chunks for both generation and
    // scoring, so the judge evaluates against what the model actually
    // saw rather than a separately truncated subset.
    const contexts = chunks
      .slice(0, 6)
      .map((c) => c.text.substring(0, 1500));

    const answer = await generate(item.question, chunks.slice(0, 6));

    const scores = await evaluateResponse({
      question: item.question,
      answer,
      contexts,
      groundTruth: item.groundTruth || '',
    });

    caseResults.push({
      question: item.question,
      answer,
      groundTruth: item.groundTruth || '',
      contexts,
      faithfulness: scores.faithfulness,
      answerRelevancy: scores.answerRelevancy,
      contextPrecision: scores.contextPrecision,
      contextRecall: scores.contextRecall,
    });
  }

  const avgFaithfulness = average(
    caseResults.map((c) => c.faithfulness)
  );

  const avgAnswerRelevancy = average(
    caseResults.map((c) => c.answerRelevancy)
  );

  const avgContextPrecision = average(
    caseResults.map((c) => c.contextPrecision)
  );

  const avgContextRecall = average(
    caseResults.map((c) => c.contextRecall)
  );

  const thresholds = config.eval.thresholds;

  const passed =
    avgFaithfulness >= thresholds.faithfulness &&
    avgAnswerRelevancy >= thresholds.answerRelevancy &&
    avgContextPrecision >= thresholds.contextPrecision &&
    avgContextRecall >= thresholds.contextRecall;

  const evalRun = await EvalRun.create({
    triggeredBy,
    collection: targetCollectionId,
    avgFaithfulness,
    avgAnswerRelevancy,
    avgContextPrecision,
    avgContextRecall,
    passed,
    thresholds,
    caseResults,
    durationMs: Date.now() - startTime,
  });

  console.log('\nEvaluation completed successfully.\n');

  return evalRun;
}

module.exports = {
  runEvaluationSuite,
  loadDataset,
};