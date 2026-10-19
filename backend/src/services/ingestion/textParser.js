const fs = require('fs');

/**
 * Parses a plain-text file (.txt, .md, .csv, .json, ...) as UTF-8.
 * Like DOCX there is no page concept, so the whole file is a single
 * unit and the chunker splits it; citations use "Document" as the
 * source label.
 */
async function parseText(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8');

  // A NUL byte means a binary file was renamed to a text extension
  if (raw.includes('\u0000')) {
    throw new Error('File does not appear to be plain text');
  }

  const text = raw.replace(/^﻿/, '').trim();
  const units = text.length > 0 ? [{ text, sourceLabel: 'Document' }] : [];

  return {
    units,
    pageCount: null,
  };
}

module.exports = { parseText };
