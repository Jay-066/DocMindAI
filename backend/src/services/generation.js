const config = require('../config/env');
const {
  getAnthropicClient,
  getOpenAIClient,
  getGroqClient,
  getDeepSeekClient,
  getGeminiClient,
} = require('./aiClients');

// Markers the model replies with instead of an answer (see buildPrompt). They are
// never shown to users: streamAnswer swaps them for a polite message.
const OFF_TOPIC = 'OFF_TOPIC';
const NOT_FOUND = 'NOT_FOUND';
const MARKER_REGEX = new RegExp(`^\\W*(${OFF_TOPIC}|${NOT_FOUND})\\b`);
// Hold back this many characters before streaming, enough to recognise a marker
const MARKER_PROBE_CHARS = 12;

/**
 * Builds the system + user prompt.
 */
function buildPrompt(query, chunks) {
  const sourceBlock = chunks
    .map(
      (c, i) =>
        `[${i + 1}] (${c.documentName} — ${c.sourceLabel})\n${c.text}`
    )
    .join('\n\n');

  const system = `You are DocMind AI, a precise document Q&A assistant.

Answer ONLY using the numbered sources below.

Every factual claim MUST include an inline citation like [1] or [2].

Never hallucinate.

First decide which case applies:
1. The question is about the documents: answer it from the sources with citations. Requests to summarize, compare, list, or explain the documents always count. If the sources answer it even partially, answer with what they contain.
2. The question is unrelated to the documents (greetings, small talk, jokes, general knowledge, coding help, or any topic the documents are not about): reply with exactly ${OFF_TOPIC} and nothing else.
3. The question is about the documents' subject, but the sources do not contain the answer: reply with exactly ${NOT_FOUND} and nothing else.

SOURCES:

${sourceBlock}`;

  return {
    system,
    user: query,
  };
}

/**
 * Automatic provider fallback
 *
 * Primary
 * ↓
 * Fallback
 * ↓
 * Gemini
 * ↓
 * OpenAI
 * ↓
 * Anthropic
 */
async function streamGeneration(query, chunks, onToken) {
  const { system, user } = buildPrompt(query, chunks);

  const providers = [
    config.llmProvider,
    config.llmFallbackProvider,
    'gemini',
    'openai',
    'anthropic',
  ].filter(Boolean);

  let lastError;

  for (const provider of [...new Set(providers)]) {
    try {
      console.log(`[chat] trying ${provider}`);

      switch (provider) {
        case 'groq':
          return await streamGroq(system, user, onToken);

        case 'deepseek':
          return await streamDeepSeek(system, user, onToken);

        case 'gemini':
          return await streamGemini(system, user, onToken);

        case 'openai':
          return await streamOpenAI(system, user, onToken);

        case 'anthropic':
          return await streamAnthropic(system, user, onToken);
      }
    } catch (err) {
      console.log(`[chat] ${provider} failed -> ${err.message}`);
      lastError = err;
    }
  }

  throw lastError;
}

/* ---------------- Anthropic ---------------- */

async function streamAnthropic(system, user, onToken) {
  let fullText = "";

  const anthropic = getAnthropicClient();

  const stream = anthropic.messages.stream({
    model: config.anthropic.model,
    max_tokens: 1024,
    system,
    messages: [
      {
        role: "user",
        content: user,
      },
    ],
  });

  stream.on("text", (delta) => {
    fullText += delta;
    onToken(delta);
  });

  await stream.finalMessage();

  return fullText;
}

/* ---------------- OpenAI ---------------- */

async function streamOpenAI(system, user, onToken) {
  let fullText = "";

  const openai = getOpenAIClient();

  const stream = await openai.chat.completions.create({
    model: config.openai.model,
    stream: true,
    messages: [
      {
        role: "system",
        content: system,
      },
      {
        role: "user",
        content: user,
      },
    ],
  });

  for await (const part of stream) {
    const delta = part.choices?.[0]?.delta?.content || "";

    if (delta) {
      fullText += delta;
      onToken(delta);
    }
  }

  return fullText;
}

/* ---------------- Groq ---------------- */

async function streamGroq(system, user, onToken) {
  let fullText = "";

  const groq = getGroqClient();

  const stream = await groq.chat.completions.create({
    model: config.groq.model,
    stream: true,
    messages: [
      {
        role: "system",
        content: system,
      },
      {
        role: "user",
        content: user,
      },
    ],
  });

  for await (const part of stream) {
    const delta = part.choices?.[0]?.delta?.content || "";

    if (delta) {
      fullText += delta;
      onToken(delta);
    }
  }

  return fullText;
}

/* ---------------- DeepSeek ---------------- */

async function streamDeepSeek(system, user, onToken) {
  let fullText = "";

  const deepseek = getDeepSeekClient();

  const stream = await deepseek.chat.completions.create({
    model: config.deepseek.model,
    stream: true,
    messages: [
      {
        role: "system",
        content: system,
      },
      {
        role: "user",
        content: user,
      },
    ],
  });

  for await (const part of stream) {
    const delta = part.choices?.[0]?.delta?.content || "";

    if (delta) {
      fullText += delta;
      onToken(delta);
    }
  }

  return fullText;
}

/* ---------------- Gemini ---------------- */

async function streamGemini(system, user, onToken) {
  const genAI = getGeminiClient();

  const model = genAI.getGenerativeModel({
    model: config.gemini.model,
  });

  const result = await model.generateContentStream(
    `${system}\n\nUser Question:\n${user}`
  );

  // The SDK also exposes the aggregated reply as result.response, which rejects alongside
  // result.stream when the stream breaks (e.g. "Failed to parse stream" during a 503). It is
  // never awaited here, so without this catch that rejection is unhandled and crashes Node;
  // the same error still reaches the provider fallback through the loop below.
  result.response.catch(() => {});

  let fullText = "";

  for await (const chunk of result.stream) {
    const text = chunk.text();

    if (text) {
      fullText += text;
      onToken(text);
    }
  }

  return fullText;
}

/* ---------------- Off-topic / not-found handling ---------------- */

function answerKind(text) {
  const match = MARKER_REGEX.exec(text);
  if (!match) return 'answer';
  return match[1] === OFF_TOPIC ? 'off_topic' : 'not_found';
}

/**
 * Streams an answer like streamGeneration, but holds back the first few
 * characters so an OFF_TOPIC / NOT_FOUND marker is never streamed to the user.
 * Resolves to { text, kind }: kind is 'answer', 'off_topic', or 'not_found',
 * and text is empty unless kind is 'answer'.
 */
async function streamAnswer(query, chunks, onToken) {
  let buffer = "";
  let kind = null;

  const raw = await streamGeneration(query, chunks, (rawDelta) => {
    const delta = normalizeCitations(rawDelta);
    if (kind === 'answer') return onToken(delta);
    if (kind) return; // marker found: swallow the rest
    buffer += delta;
    if (buffer.trimStart().length < MARKER_PROBE_CHARS) return;
    kind = answerKind(buffer);
    if (kind === 'answer') onToken(buffer);
  });

  // Short replies (including a bare marker) end before the probe fills up
  if (!kind) {
    kind = answerKind(buffer);
    if (kind === 'answer' && buffer) onToken(buffer);
  }

  return { text: kind === 'answer' ? normalizeCitations(raw) : "", kind };
}

// Some models (e.g. gpt-oss via Groq) cite as 【1】; convert to the [1] form the
// citation checker and UI expect. Character-level, so it is safe on stream deltas.
function normalizeCitations(text) {
  return text.replace(/【/g, '[').replace(/】/g, ']');
}

/**
 * The polite reply shown instead of an answer for off-topic questions or
 * questions the documents don't cover.
 */
function fallbackMessage(kind, { collectionName, docNames = [] } = {}) {
  const where = collectionName ? `the documents in "${collectionName}"` : 'your documents';

  if (kind === 'off_topic') {
    const files =
      docNames.length > 1
        ? `${docNames.slice(0, -1).join(', ')} and ${docNames[docNames.length - 1]}`
        : docNames[0];
    return [
      `Sorry, that question doesn't seem to be related to ${where}, so I can't answer it here.`,
      files
        ? `I can only answer questions about the files in this collection, such as ${files}. Try asking something like "Summarize ${docNames[0]}".`
        : 'Please ask a question about the files in this collection.',
    ].join(' ');
  }

  return `I couldn't find information about that in ${where}. Try rephrasing your question, or upload a document that covers this topic.`;
}

/* ---------------- Non-stream ---------------- */

async function generate(query, chunks) {
  const { text, kind } = await streamAnswer(query, chunks, () => {});
  return kind === 'answer' ? text : fallbackMessage(kind);
}

module.exports = {
  streamGeneration,
  streamAnswer,
  fallbackMessage,
  generate,
  buildPrompt,
};