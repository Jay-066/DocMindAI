/**
 * Users naturally write questions like "according to report.pdf, what is X?"
 * or "from Mini_project_document_B-2.pdf, define Y". The filename itself
 * carries no semantic meaning for retrieval (chunk text never contains
 * the source filename), so leaving it in the query pollutes both BM25
 * (which tries to literally match filename tokens against chunk text)
 * and dense embedding search (which skews the vector toward "a sentence
 * mentioning a filename" instead of the actual question).
 *
 * This strips filename-like patterns and common framing phrases before
 * the query is used for retrieval, while the ORIGINAL message (with
 * filename intact) is still what gets shown to the user and passed to
 * the LLM for generation - only the retrieval-search query is cleaned.
 */
function cleanRetrievalQuery(message) {
  let cleaned = message;

  // Strip filename-like tokens: word characters/spaces/hyphens followed
  // by a known document extension (e.g. "Mini_project_document_B-2.pdf")
  cleaned = cleaned.replace(/[\w\-]+\.(pdf|docx?|pptx?|xlsx?|csv|png|jpe?g|webp|mp3|wav|m4a|mp4|mov|webm)/gi, '');

  // Strip common framing phrases that reference "the document/source/file"
  // once the filename itself is gone, so we don't retrieve on "according to"
  cleaned = cleaned.replace(
    /\b(according to|from|based on|in|as (?:stated|mentioned|described) in)\b\s*[,:]?\s*/gi,
    ''
  );

  cleaned = cleaned.replace(/\s{2,}/g, ' ').trim();
  cleaned = cleaned.replace(/^[,:;\s]+/, '').trim(); // strip stray leading punctuation left after removals

  // Safety net: if stripping left nothing meaningful (e.g. the whole
  // message was just a filename), fall back to the original message
  // rather than sending an empty/near-empty query to retrieval.
  return cleaned.length >= 3 ? cleaned : message;
}

module.exports = { cleanRetrievalQuery };