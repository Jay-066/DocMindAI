require('dotenv').config();

function required(name, fallback = undefined) {
  return process.env[name] ?? fallback;
}

const config = {
  port: parseInt(required('PORT', '5000'), 10),
  nodeEnv: required('NODE_ENV', 'development'),
  frontendUrl: required('FRONTEND_URL', 'http://localhost:3000'),

  mongoUri: required(
    'MONGO_URI',
    'mongodb://127.0.0.1:27017/docmind'
  ),

  chroma: {
    url: required('CHROMA_URL', 'http://localhost:8000'),
    collectionPrefix: required(
      'CHROMA_COLLECTION_PREFIX',
      'docmind'
    ),
  },

  jwt: {
    secret: required(
      'JWT_SECRET',
      'dev_secret_change_me'
    ),
    expiresIn: required(
      'JWT_EXPIRES_IN',
      '7d'
    ),
  },

  cohere: {
    apiKey: required('COHERE_API_KEY'),
    embedModel: required(
      'COHERE_EMBED_MODEL',
      'embed-english-v3.0'
    ),
    rerankModel: required(
      'COHERE_RERANK_MODEL',
      'rerank-english-v3.0'
    ),
  },

  // =====================================================
  // CHAT PROVIDERS
  // =====================================================

  llmProvider: required(
    'LLM_PROVIDER',
    'gemini'
  ),

  llmFallbackProvider: required(
    'LLM_FALLBACK_PROVIDER',
    'groq'
  ),

  // =====================================================
  // GEMINI
  // =====================================================

  gemini: {
    apiKey: required('GEMINI_API_KEY'),
    model: required(
      'GEMINI_MODEL',
      'gemini-2.5-flash'
    ),
  },

  // =====================================================
  // GROQ
  // =====================================================

  groq: {
    apiKey: required('GROQ_API_KEY'),
    model: required(
      'GROQ_MODEL',
      'llama-3.1-8b-instant'
    ),
  },

  // =====================================================
  // DEEPSEEK
  // =====================================================

  deepseek: {
    apiKey: required('DEEPSEEK_API_KEY'),
    model: required(
      'DEEPSEEK_MODEL',
      'deepseek-chat'
    ),
  },

  // =====================================================
  // OPENAI
  // =====================================================

  openai: {
    apiKey: required('OPENAI_API_KEY'),
    model: required(
      'OPENAI_MODEL',
      'gpt-4o'
    ),
    whisperModel: required(
      'OPENAI_WHISPER_MODEL',
      'whisper-1'
    ),
  },

  // =====================================================
  // ANTHROPIC
  // =====================================================

  anthropic: {
    apiKey: required('ANTHROPIC_API_KEY'),
    model: required(
      'ANTHROPIC_MODEL',
      'claude-sonnet-4-6'
    ),
  },

  // =====================================================
  // EVALUATION
  // =====================================================

  eval: {
    judgeProvider: required(
      'EVAL_JUDGE_PROVIDER',
      'gemini'
    ),

    judgeFallbackProvider: required(
      'EVAL_JUDGE_FALLBACK_PROVIDER',
      'groq'
    ),

    maxCases: parseInt(
      required('EVAL_MAX_CASES', '8'),
      10
    ),

    thresholds: {
      faithfulness: parseFloat(
        required(
          'EVAL_FAITHFULNESS_THRESHOLD',
          '0.7'
        )
      ),

      answerRelevancy: parseFloat(
        required(
          'EVAL_ANSWER_RELEVANCY_THRESHOLD',
          '0.7'
        )
      ),

      contextPrecision: parseFloat(
        required(
          'EVAL_CONTEXT_PRECISION_THRESHOLD',
          '0.65'
        )
      ),

      contextRecall: parseFloat(
        required(
          'EVAL_CONTEXT_RECALL_THRESHOLD',
          '0.65'
        )
      ),
    },
  },

  upload: {
    maxFileSizeMb: parseInt(
      required('MAX_FILE_SIZE_MB', '50'),
      10
    ),

    dir: required(
      'UPLOAD_DIR',
      'uploads'
    ),
  },

  chunking: {
    size: parseInt(
      required('CHUNK_SIZE', '400'),
      10
    ),

    overlap: parseInt(
      required('CHUNK_OVERLAP', '150'),
      10
    ),
  },

  retrieval: {
    denseTopK: parseInt(
      required('DENSE_TOP_K', '20'),
      10
    ),

    bm25TopK: parseInt(
      required('BM25_TOP_K', '20'),
      10
    ),

    rrfK: parseInt(
      required('RRF_K', '60'),
      10
    ),

    rerankTopN: parseInt(
      required('RERANK_TOP_N', '4'),
      10
    ),
  },
};

module.exports = config;