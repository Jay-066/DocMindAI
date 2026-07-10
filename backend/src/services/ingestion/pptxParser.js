const fs = require('fs');
const JSZip = require('jszip');
const { parseStringPromise } = require('xml2js');

/**
 * PPTX files are a zip archive of XML. Each slide lives at
 * ppt/slides/slideN.xml, with text runs nested under <a:t> tags.
 * We extract text per slide (not the whole deck as one blob) so
 * citations can point to an exact slide number.
 */
function extractTextFromSlideXmlObj(xmlObj) {
  const texts = [];

  function walk(node) {
    if (!node || typeof node !== 'object') return;
    if (Array.isArray(node)) {
      node.forEach(walk);
      return;
    }
    for (const key of Object.keys(node)) {
      if (key === 'a:t') {
        const val = node[key];
        if (Array.isArray(val)) {
          val.forEach((v) => {
            if (typeof v === 'string') texts.push(v);
            else if (v && v._) texts.push(v._);
          });
        }
      } else {
        walk(node[key]);
      }
    }
  }

  walk(xmlObj);
  return texts.join(' ');
}

async function parsePPTX(filePath) {
  const buffer = fs.readFileSync(filePath);
  const zip = await JSZip.loadAsync(buffer);

  const slideFiles = Object.keys(zip.files)
    .filter((name) => /^ppt\/slides\/slide\d+\.xml$/.test(name))
    .sort((a, b) => {
      const numA = parseInt(a.match(/slide(\d+)\.xml/)[1], 10);
      const numB = parseInt(b.match(/slide(\d+)\.xml/)[1], 10);
      return numA - numB;
    });

  const units = [];
  for (const slideFile of slideFiles) {
    const slideNum = parseInt(slideFile.match(/slide(\d+)\.xml/)[1], 10);
    const xmlContent = await zip.files[slideFile].async('string');
    const xmlObj = await parseStringPromise(xmlContent);
    const text = extractTextFromSlideXmlObj(xmlObj).trim();

    if (text.length > 0) {
      units.push({
        text,
        sourceLabel: `Slide ${slideNum}`,
        slideNumber: slideNum,
      });
    }
  }

  return {
    units,
    pageCount: slideFiles.length,
  };
}

module.exports = { parsePPTX };
