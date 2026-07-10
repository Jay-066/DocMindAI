const config = require('../config/env');

/**
 * Splits text into overlapping chunks by approximate token count
 * (using whitespace-word count as a cheap proxy for tokens).
 * Each returned chunk carries any metadata passed through unchanged,
 * so callers can attach page/slide/timestamp info per source unit.
 */
function chunkText(text, metadata = {}) {
  const { size = config.chunking.size, overlap = config.chunking.overlap } = metadata;
  const words = (text || '').split(/\s+/).filter(Boolean);

  if (words.length === 0) return [];

  const chunks = [];
  let start = 0;
  let index = 0;

  while (start < words.length) {
    const end = Math.min(start + size, words.length);
    const chunkWords = words.slice(start, end);
    const chunkStr = chunkWords.join(' ').trim();

    if (chunkStr.length > 0) {
      chunks.push({
        text: chunkStr,
        chunkIndex: index,
        ...metadata,
      });
      index += 1;
    }

    if (end === words.length) break;
    start = end - overlap;
    if (start < 0) start = 0;
  }

  return chunks;
}

/**
 * Chunks a list of "units" (e.g. one per page/slide/sheet/segment),
 * each unit being { text, ...unitMetadata }. Produces a flat array of
 * chunks with continuous chunkIndex across the whole document, while
 * preserving each unit's own metadata (page number, slide number, etc).
 */
function chunkUnits(units) {
  const allChunks = [];
  let globalIndex = 0;

  for (const unit of units) {
    const { text, ...unitMeta } = unit;
    const localChunks = chunkText(text, unitMeta);
    for (const c of localChunks) {
      allChunks.push({ ...c, chunkIndex: globalIndex });
      globalIndex += 1;
    }
  }

  return allChunks;
}

module.exports = { chunkText, chunkUnits };
