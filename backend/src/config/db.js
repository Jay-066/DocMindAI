const mongoose = require('mongoose');
const config = require('./env');

async function connectDB() {
  try {
    mongoose.set('strictQuery', true);
    await mongoose.connect(config.mongoUri);
    console.log(`[mongo] connected -> ${config.mongoUri}`);

    mongoose.connection.on('error', (err) => {
      console.error('[mongo] connection error:', err.message);
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('[mongo] disconnected');
    });
  } catch (err) {
    console.error('[mongo] initial connection failed:', err.message);
    process.exit(1);
  }
}

module.exports = connectDB;
