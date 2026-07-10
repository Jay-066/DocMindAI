/**
 * Creates (or promotes) an admin user, useful for first-run local
 * setup and for CI pipelines that need an authenticated account to
 * seed a collection before running the eval gate.
 *
 * Usage: node src/scripts/seedAdmin.js <email> <password> <name>
 * Defaults: admin@docmind.ai / admin123 / Admin
 */
require('dotenv').config();
const mongoose = require('mongoose');
const config = require('../config/env');
const User = require('../models/User');

async function main() {
  const [, , emailArg, passwordArg, nameArg] = process.argv;
  const email = emailArg || 'admin@docmind.ai';
  const password = passwordArg || 'admin123';
  const name = nameArg || 'Admin';

  await mongoose.connect(config.mongoUri);

  let user = await User.findOne({ email: email.toLowerCase() });
  if (user) {
    user.role = 'admin';
    await user.save();
    console.log(`[seed] existing user ${email} promoted to admin`);
  } else {
    user = await User.create({ name, email, password, role: 'admin' });
    console.log(`[seed] created admin user: ${email} / ${password}`);
  }

  await mongoose.disconnect();
  process.exit(0);
}

main().catch((err) => {
  console.error('[seed] failed:', err.message);
  process.exit(1);
});
