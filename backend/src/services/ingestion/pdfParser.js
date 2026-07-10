const fs = require('fs');
const pdfParse = require('pdf-parse');

/**
 * Parses a PDF and returns one "unit" per page so chunks can carry
 * accurate page-number citations. pdf-parse gives us full text with a
 * pagerender hook we use to capture per-page boundaries.
 */
async function parsePDF(filePath) {
  const dataBuffer = fs.readFileSync(filePath);
  const pages = [];

  await pdfParse(dataBuffer, {
    pagerender: async (pageData) => {
      const textContent = await pageData.getTextContent();
      const text = textContent.items.map((item) => item.str).join(' ');
      pages.push(text);
      return text;
    },
  });

  const units = pages
    .map((text, i) => ({
      text: text.trim(),
      sourceLabel: `Page ${i + 1}`,
      pageNumber: i + 1,
    }))
    .filter((u) => u.text.length > 0);

  return {
    units,
    pageCount: pages.length,
  };
}

module.exports = { parsePDF };
