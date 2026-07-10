const Tesseract = require('tesseract.js');

/**
 * Runs OCR on an image file using Tesseract.js (pure JS, no native
 * binary dependency required). Produces a single text unit for the
 * whole image; source label is generic since images have no pages.
 */
async function parseImage(filePath) {
  const { data } = await Tesseract.recognize(filePath, 'eng', {
    logger: () => {}, // suppress verbose progress logs
  });

  const text = (data.text || '').trim();
  const units = text.length > 0 ? [{ text, sourceLabel: 'Image (OCR)' }] : [];

  return {
    units,
    pageCount: null,
  };
}

module.exports = { parseImage };
