const config = require('../config/env');
const {
  getAnthropicClient,
  getOpenAIClient,
  getGroqClient,
  getDeepSeekClient,
  getGeminiClient,
} = require('./aiClients');

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

If the answer cannot be found in the sources, clearly say so.

Never hallucinate.

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

/* ---------------- Non-stream ---------------- */

async function generate(query, chunks) {
  let text = "";

  await streamGeneration(query, chunks, (delta) => {
    text += delta;
  });

  return text;
}

module.exports = {
  streamGeneration,
  generate,
  buildPrompt,
};