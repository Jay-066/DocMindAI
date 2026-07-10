/**
 * Post-processes a generated answer against the source list it was
 * given. Two responsibilities:
 * 1. Extract which [n] markers were actually used, so the frontend
 *    can render only the citations that appear in the text.
 * 2. Flag answers that used zero citations despite sources being
 *    available - a signal that citation enforcement in the prompt
 *    didn't hold, surfaced to the eval layer / UI as a warning.
 */

function extractUsedCitations(answerText, chunks) {
  const citationRegex = /\[(\d+)\]/g;
  const usedIndices = new Set();
  let match;

  while ((match = citationRegex.exec(answerText)) !== null) {
    const idx = parseInt(match[1], 10);
    if (idx >= 1 && idx <= chunks.length) {
      usedIndices.add(idx);
    }
  }

  const citations = Array.from(usedIndices)
    .sort((a, b) => a - b)
    .map((idx) => {
      const chunk = chunks[idx - 1];
      return {
        chunkId: chunk.chunkId,
        documentName: chunk.documentName,
        sourceLabel: chunk.sourceLabel,
        snippet: chunk.text.slice(0, 240) + (chunk.text.length > 240 ? '...' : ''),
        score: chunk.rerankScore ?? null,
      };
    });

  return citations;
}

function hasUncitedClaims(answerText, chunks) {
  if (chunks.length === 0) return false; // no sources available, nothing to cite
  const hasAnyCitation = /\[\d+\]/.test(answerText);
  const isRefusal = /don't have enough information|not contain enough information|cannot find|no relevant/i.test(
    answerText
  );
  return !hasAnyCitation && !isRefusal;
}

module.exports = { extractUsedCitations, hasUncitedClaims };
