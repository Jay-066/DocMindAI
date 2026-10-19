const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const config = require('../config/env');
const User = require('../models/User');

const googleClient = new OAuth2Client();

// "Remember me" gets a longer-lived token; the frontend also keeps it in localStorage
// instead of sessionStorage, so it survives closing the browser.
function signToken(userId, remember = false) {
  return jwt.sign({ id: userId }, config.jwt.secret, {
    expiresIn: remember ? config.jwt.rememberExpiresIn : config.jwt.expiresIn,
  });
}

// First registered user becomes admin automatically
async function roleForNewUser() {
  const userCount = await User.countDocuments();
  return userCount === 0 ? 'admin' : 'user';
}

async function register(req, res) {
  const { name, email, password, remember } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Name, email, and password are required' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }

  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) {
    return res.status(409).json({ error: 'An account with this email already exists' });
  }

  const user = await User.create({ name, email, password, role: await roleForNewUser() });
  const token = signToken(user._id, remember);

  res.status(201).json({ token, user: user.toSafeJSON() });
}

async function login(req, res) {
  const { email, password, remember } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
  if (!user) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }
  if (!user.password) {
    return res.status(401).json({ error: 'This account uses Google sign-in. Continue with Google instead.' });
  }

  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  const token = signToken(user._id, remember);
  res.json({ token, user: user.toSafeJSON() });
}

/**
 * POST /api/auth/google
 * Body: { credential, remember } where credential is the ID token from Google's
 * "Sign in with Google" button. Verifies it, then signs in the matching user,
 * links Google to an existing account with the same email, or creates a new one.
 */
async function googleAuth(req, res) {
  if (!config.google.clientId) {
    return res.status(503).json({ error: 'Google sign-in is not configured on this server' });
  }

  const { credential, remember } = req.body;
  if (!credential) {
    return res.status(400).json({ error: 'Missing Google credential' });
  }

  let payload;
  try {
    const ticket = await googleClient.verifyIdToken({ idToken: credential, audience: config.google.clientId });
    payload = ticket.getPayload();
  } catch (err) {
    return res.status(401).json({ error: 'Google sign-in failed. Please try again.' });
  }

  if (!payload?.email || !payload.email_verified) {
    return res.status(401).json({ error: 'Your Google account email is not verified' });
  }

  const email = payload.email.toLowerCase();
  let user = await User.findOne({ $or: [{ googleId: payload.sub }, { email }] });

  if (!user) {
    user = await User.create({
      name: payload.name || email.split('@')[0],
      email,
      googleId: payload.sub,
      avatarUrl: payload.picture || null,
      role: await roleForNewUser(),
    });
  } else if (!user.googleId || user.avatarUrl !== (payload.picture || null)) {
    // Google has verified this email, so it is safe to link it to the existing account
    user.googleId = user.googleId || payload.sub;
    user.avatarUrl = payload.picture || user.avatarUrl;
    await user.save();
  }

  const token = signToken(user._id, remember);
  res.json({ token, user: user.toSafeJSON() });
}

/**
 * GET /api/auth/config
 * Public sign-in options for the login/register pages. The Google client ID is not
 * a secret; serving it here keeps GOOGLE_CLIENT_ID in one place (backend/.env).
 */
async function authConfig(req, res) {
  res.json({ googleClientId: config.google.clientId || null });
}

async function getMe(req, res) {
  res.json({ user: req.user.toSafeJSON() });
}

module.exports = { register, login, googleAuth, authConfig, getMe };
