const Conversation = require('../models/Conversation');
const Collection = require('../models/Collection');
const { hybridRetrieve } = require('../services/retrieval');
const { streamGeneration } = require('../services/generation');
const { extractUsedCitations, hasUncitedClaims } = require('../services/citationEnforce');
const { evaluateResponse } = require('../services/ragas');
const { cleanRetrievalQuery } = require('../services/queryCleaner');

/**
 * POST /api/chat/stream
 * Body: { collectionId, conversationId? , message }
 *
 * Streams the answer token-by-token over Server-Sent Events. Event
 * types sent to the client:
 *   "sources"  -> the retrieved+reranked chunks (sent before generation starts)
 *   "token"    -> a text delta to append to the streaming answer
 *   "citations"-> final validated citation list (sent after generation)
 *   "eval"     -> live RAGAS-style scores for this turn
 *   "done"     -> stream complete
 *   "error"    -> something went wrong
 */
async function streamChat(req, res) {
  const { collectionId, conversationId, message } = req.body;

  if (!collectionId || !message || !message.trim()) {
    return res.status(400).json({ error: 'collectionId and message are required' });
  }

  const collection = await Collection.findOne({ _id: collectionId, owner: req.user._id });
  if (!collection) {
    return res.status(404).json({ error: 'Collection not found' });
  }

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  });

  const sendEvent = (event, data) => {
    res.write(`event: ${event}\n`);
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  try {
    let conversation = conversationId
      ? await Conversation.findOne({ _id: conversationId, owner: req.user._id })
      : null;

    if (!conversation) {
      conversation = await Conversation.create({
        owner: req.user._id,
        collection: collection._id,
        title: message.slice(0, 60),
        messages: [],
      });
    }

    conversation.messages.push({ role: 'user', content: message, citations: [] });

    const retrievalQuery = cleanRetrievalQuery(message);
    if (retrievalQuery !== message) {
      console.log(`[chat] cleaned retrieval query: "${message}" -> "${retrievalQuery}"`);
    }

    const chunks = await hybridRetrieve(collection._id, retrievalQuery);
    sendEvent('sources', {
      chunks: chunks.map((c, i) => ({
        index: i + 1,
        documentName: c.documentName,
        sourceLabel: c.sourceLabel,
        snippet: c.text.slice(0, 200),
        score: c.rerankScore,
      })),
    });

    let fullAnswer = '';
    await streamGeneration(message, chunks, (delta) => {
      fullAnswer += delta;
      sendEvent('token', { delta });
    });

    const citations = extractUsedCitations(fullAnswer, chunks);
    const uncited = hasUncitedClaims(fullAnswer, chunks);
    sendEvent('citations', { citations, warning: uncited ? 'Answer contains uncited claims' : null });

    const assistantMessage = {
      role: 'assistant',
      content: fullAnswer,
      citations,
      eval: { faithfulness: null, answerRelevancy: null, contextPrecision: null, contextRecall: null },
    };
    conversation.messages.push(assistantMessage);
    await conversation.save();

    sendEvent('done', { conversationId: conversation._id.toString() });
    res.end();

    // Fire live evaluation after the stream closes so it doesn't block
    // the user's perceived response time; results are pushed via the
    // conversation record and picked up by the dashboard/poll.
    evaluateResponse({
      question: message,
      answer: fullAnswer,
      contexts: chunks.map((c) => c.text),
    })
      .then(async (scores) => {
        const conv = await Conversation.findById(conversation._id);
        if (!conv) return;
        const lastMsg = conv.messages[conv.messages.length - 1];
        lastMsg.eval = scores;
        await conv.save();
      })
      .catch((err) => console.error('[chat] live eval failed:', err.message));
  } catch (err) {
    console.error('[chat] stream error:', err.message);
    sendEvent('error', { error: err.message });
    res.end();
  }
}

async function listConversations(req, res) {
  const { collectionId } = req.query;
  const filter = { owner: req.user._id };
  if (collectionId) filter.collection = collectionId;

  const conversations = await Conversation.find(filter)
    .select('title collection createdAt updatedAt')
    .sort({ updatedAt: -1 });
  res.json({ conversations });
}

async function getConversation(req, res) {
  const conversation = await Conversation.findOne({ _id: req.params.id, owner: req.user._id });
  if (!conversation) {
    return res.status(404).json({ error: 'Conversation not found' });
  }
  res.json({ conversation });
}

async function deleteConversation(req, res) {
  const conversation = await Conversation.findOne({ _id: req.params.id, owner: req.user._id });
  if (!conversation) {
    return res.status(404).json({ error: 'Conversation not found' });
  }
  await conversation.deleteOne();
  res.json({ message: 'Conversation deleted' });
}

module.exports = { streamChat, listConversations, getConversation, deleteConversation };