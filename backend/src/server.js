const dns = require('dns');
dns.setDefaultResultOrder('ipv4first');
const app = require('./app');
const config = require('./config/env');
const connectDB = require('./config/db');
const { pingChroma } = require('./config/chroma');
const { rebuildAllIndexes } = require('./scripts/rebuildBM25');

async function start() {
  await connectDB();

  const chromaOk = await pingChroma();
  if (!chromaOk) {
    console.warn('[startup] ChromaDB is not reachable yet. Make sure it is running:');
    console.warn('  chroma run --host 0.0.0.0 --port 8000');
  }

  await rebuildAllIndexes();

  app.listen(config.port, () => {
    console.log(`[server] DocMind AI backend running on http://localhost:${config.port}`);
    console.log(`[server] environment: ${config.nodeEnv}`);
  });
}

start().catch((err) => {
  console.error('[startup] fatal error:', err);
  process.exit(1);
});
