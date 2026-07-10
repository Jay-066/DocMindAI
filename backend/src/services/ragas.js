const config = require('../config/env');
const { getAnthropicClient, getOpenAIClient, getGroqClient, getDeepSeekClient } = require('./aiClients');

/**
 * Calls a specific provider once with the given prompt and parses the
 * JSON response. Does not retry or fall back - that's handled by the
 * caller so we can share retry/fallback logic across call sites.
 */
async function callProviderOnce(prompt, provider) {
  let raw;

  if (provider === 'openai') {
    const openai = getOpenAIClient();
    const response = await openai.chat.completions.create({
      model: config.openai.model,
      messages: [
        { role: 'system', content: 'You are a strict evaluation judge. Respond with ONLY valid JSON, no markdown, no preamble.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0,
    });
    raw = response.choices[0].message.content;
  } else if (provider === 'groq') {
    const groq = getGroqClient();
    const response = await groq.chat.completions.create({
      model: config.groq.model,
      messages: [
        { role: 'system', content: 'You are a strict evaluation judge. Respond with ONLY valid JSON, no markdown, no preamble.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0,
    });
    raw = response.choices[0].message.content;
  } else if (provider === 'deepseek') {
    const deepseek = getDeepSeekClient();
    const response = await deepseek.chat.completions.create({
      model: config.deepseek.model,
      messages: [
        { role: 'system', content: 'You are a strict evaluation judge. Respond with ONLY valid JSON, no markdown, no preamble.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0,
    });
    raw = response.choices[0].message.content;
  } else {
    const anthropic = getAnthropicClient();
    const response = await anthropic.messages.create({
      model: config.anthropic.model,
      max_tokens: 512,
      system: 'You are a strict evaluation judge. Respond with ONLY valid JSON, no markdown, no preamble.',
      messages: [{ role: 'user', content: prompt }],
    });
    raw = response.content[0].text;
  }

  const cleaned = raw.replace(/```json|```/g, '').trim();
  return JSON.parse(cleaned);
}

/**
 * Calls the judge with automatic failover: tries the primary provider
 * once, and on ANY error (rate limit, billing/quota, network) moves
 * immediately to the fallback provider rather than burning time on
 * retries that are unlikely to succeed within the same minute. Only
 * the fallback provider gets a couple of retries with backoff, since
 * by that point we've already established the primary is unusable
 * right now.
 */
async function callJudge(prompt) {
  const primaryProvider = config.eval.judgeProvider;
  const fallbackProvider = config.eval.judgeFallbackProvider;

  try {
    return await callProviderOnce(prompt, primaryProvider);
  } catch (primaryErr) {
    console.warn(`[ragas] ${primaryProvider} failed (${primaryErr.message?.slice(0, 120)}), ${fallbackProvider ? `falling back to ${fallbackProvider}` : 'no fallback configured'}`);

    if (!fallbackProvider || fallbackProvider === primaryProvider) {
      return null;
    }

    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        return await callProviderOnce(prompt, fallbackProvider);
      } catch (fallbackErr) {
        const isRateLimit = fallbackErr?.status === 429 || fallbackErr?.code === 'rate_limit_exceeded';
        if (isRateLimit && attempt === 0) {
          const retryAfterHeader = fallbackErr?.headers?.['retry-after'];
          const waitMs = retryAfterHeader ? parseFloat(retryAfterHeader) * 1000 : 2000;
          console.warn(`[ragas] ${fallbackProvider} rate limited, retrying once in ${Math.round(waitMs)}ms`);
          await new Promise((r) => setTimeout(r, waitMs));
          continue;
        }
        console.error(`[ragas] fallback provider ${fallbackProvider} also failed:`, fallbackErr.message?.slice(0, 200));
        return null;
      }
    }
    return null;
  }
}

/**
 * Runs all four RAGAS-style metrics for one question/answer/context
 * triple in a SINGLE judge call instead of four separate ones. This
 * cuts API calls (and therefore rate-limit exposure + latency) by 4x
 * compared to scoring each metric independently.
 */
async function evaluateResponse({
  question,
  answer,
  contexts,
  groundTruth = "",
}) {
  const limitedContexts = contexts
    .slice(0, 6)
    .map((c) => c.substring(0, 1500));

  const contextBlock = limitedContexts.map((c, i) => `[${i + 1}] ${c}`).join('\n');

  const prompt = `You are scoring a RAG (retrieval-augmented generation) system's answer on four independent metrics. Score each from 0 to 1.

QUESTION:
${question}

RETRIEVED CONTEXTS:
${contextBlock}

ANSWER:
${answer}
${groundTruth ? `\nGROUND TRUTH ANSWER (for reference):\n${groundTruth}\n` : ''}
Score these four metrics:

1. faithfulness: What fraction of factual claims in the ANSWER are directly supported by the RETRIEVED CONTEXTS? (0 = hallucinated/unsupported, 1 = fully grounded)
2. answerRelevancy: How directly and completely does the ANSWER address the QUESTION? (0 = irrelevant/evasive, 1 = fully addresses it)
3. contextPrecision: What fraction of the RETRIEVED CONTEXTS are actually relevant/useful for answering the QUESTION? (0 = mostly noise, 1 = all relevant)
4. contextRecall: ${groundTruth ? 'What fraction of the information in the GROUND TRUTH is present somewhere in the RETRIEVED CONTEXTS?' : 'Do the RETRIEVED CONTEXTS collectively contain enough information to fully answer the QUESTION?'} (0 = missing key info, 1 = fully sufficient)

Respond with JSON only, no markdown, no preamble:
{"faithfulness": <float 0-1>, "answerRelevancy": <float 0-1>, "contextPrecision": <float 0-1>, "contextRecall": <float 0-1>}`;

  const result = await callJudge(prompt);

  if (!result) {
    console.warn('[ragas] judge call failed on all providers, defaulting all scores to 0 for this question');
  }

  return {
    faithfulness: result?.faithfulness ?? 0,
    answerRelevancy: result?.answerRelevancy ?? 0,
    contextPrecision: result?.contextPrecision ?? 0,
    contextRecall: result?.contextRecall ?? 0,
  };
}

module.exports = {
  evaluateResponse,
};