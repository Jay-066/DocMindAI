const mammoth = require('mammoth');

/**
 * Parses a DOCX file into raw text. Word documents don't have a
 * reliable native "page" concept (pagination is a rendering detail),
 * so we treat the whole document as a single unit and let the chunker
 * split it; citations fall back to "Document" as the source label.
 */
async function parseDOCX(filePath) {
  const result = await mammoth.extractRawText({ path: filePath });
  const text = (result.value || '').trim();

  const units = text.length > 0 ? [{ text, sourceLabel: 'Document' }] : [];

  return {
    units,
    pageCount: null,
  };
}

module.exports = { parseDOCX };
