const Anthropic = require('@anthropic-ai/sdk');
const OpenAI = require('openai');
const { CohereClient } = require('cohere-ai');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const config = require('../config/env');

/**
 * Anthropic
 */
let anthropicClient = null;

function getAnthropicClient() {
  if (!anthropicClient) {
    anthropicClient = new Anthropic({
      apiKey: config.anthropic.apiKey || 'missing',
    });
  }

  return anthropicClient;
}

/**
 * OpenAI
 */
let openaiClient = null;

function getOpenAIClient() {
  if (!openaiClient) {
    openaiClient = new OpenAI({
      apiKey: config.openai.apiKey || 'missing',
    });
  }

  return openaiClient;
}

/**
 * Cohere
 */
let cohereClient = null;

function getCohereClient() {
  if (!cohereClient) {
    cohereClient = new CohereClient({
      token: config.cohere.apiKey || 'missing',
    });
  }

  return cohereClient;
}

/**
 * Groq
 */
let groqClient = null;

function getGroqClient() {
  if (!groqClient) {
    groqClient = new OpenAI({
      apiKey: config.groq.apiKey || 'missing',
      baseURL: 'https://api.groq.com/openai/v1',
    });
  }

  return groqClient;
}

/**
 * DeepSeek
 */
let deepseekClient = null;

function getDeepSeekClient() {
  if (!deepseekClient) {
    deepseekClient = new OpenAI({
      apiKey: config.deepseek.apiKey || 'missing',
      baseURL: 'https://api.deepseek.com/v1',
    });
  }

  return deepseekClient;
}

/**
 * Gemini
 */
let geminiClient = null;

function getGeminiClient() {
  if (!geminiClient) {
    geminiClient = new GoogleGenerativeAI(
      config.gemini.apiKey || 'missing'
    );
  }

  return geminiClient;
}

module.exports = {
  getAnthropicClient,
  getOpenAIClient,
  getCohereClient,
  getGroqClient,
  getDeepSeekClient,
  getGeminiClient,
};