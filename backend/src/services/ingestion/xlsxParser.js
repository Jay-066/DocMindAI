const XLSX = require('xlsx');

/**
 * Parses Excel/CSV files. Each sheet becomes one unit; rows are
 * flattened into readable "col: value | col: value" lines so the
 * chunker and LLM can work with them like prose while staying
 * traceable back to a specific sheet for citations.
 */
async function parseXLSX(filePath) {
  const workbook = XLSX.readFile(filePath);
  const units = [];

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });

    if (rows.length === 0) continue;

    const lines = rows.map((row) =>
      Object.entries(row)
        .map(([col, val]) => `${col}: ${val}`)
        .join(' | ')
    );

    const text = lines.join('\n').trim();
    if (text.length > 0) {
      units.push({
        text,
        sourceLabel: `Sheet: ${sheetName}`,
        sheetName,
      });
    }
  }

  return {
    units,
    pageCount: workbook.SheetNames.length,
  };
}

module.exports = { parseXLSX };
