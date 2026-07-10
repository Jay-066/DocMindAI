/**
 * Retries an async function on 429 rate-limit errors with exponential
 * backoff. Groq (and other providers) return a `retry-after` hint in
 * the error response when rate limited - we honor that when present,
 * otherwise fall back to exponential backoff (1s, 2s, 4s, ...).
 *
 * Only retries on 429 specifically; all other errors are re-thrown
 * immediately since retrying won't help (e.g. auth errors, bad request).
 */
async function withRetry(fn, { maxRetries = 3, baseDelayMs = 1000 } = {}) {
  let lastError;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      const isRateLimit = err?.status === 429 || err?.code === 'rate_limit_exceeded';

      if (!isRateLimit || attempt === maxRetries) {
        throw err;
      }

      // Honor the provider's suggested retry-after header if present,
      // otherwise use exponential backoff.
      const retryAfterHeader = err?.headers?.['retry-after'];
      const retryAfterSeconds = retryAfterHeader ? parseFloat(retryAfterHeader) : null;
      const delayMs = retryAfterSeconds
        ? retryAfterSeconds * 1000 + 250 // small buffer past the suggested wait
        : baseDelayMs * Math.pow(2, attempt);

      console.warn(
        `[retry] rate limited, waiting ${Math.round(delayMs)}ms before retry ${attempt + 1}/${maxRetries}...`
      );
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  throw lastError;
}

module.exports = { withRetry };