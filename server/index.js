const express = require('express');
const rateLimit = require('express-rate-limit');
const admin = require('firebase-admin');
const sgMail = require('@sendgrid/mail');

// Load server/.env automatically if dotenv is installed. This keeps CLAUDE_KEY out
// of the project root and prevents accidental client exposure.
try {
  require('dotenv').config();
} catch (e) {
  // dotenv optional
}

// Initialize Firebase Admin (uses GOOGLE_APPLICATION_CREDENTIALS env var or default credentials)
try {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    databaseURL: process.env.FIREBASE_DATABASE_URL
  });
  console.log('Firebase Admin initialized successfully');
} catch (error) {
  console.warn('Firebase Admin initialization failed:', error.message);
  console.warn('Notification features will not work until Firebase is configured.');
}

const db = admin.firestore();

// Configure SendGrid
const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
if (SENDGRID_API_KEY) {
  sgMail.setApiKey(SENDGRID_API_KEY);
  console.log('SendGrid configured');
} else {
  console.warn('SENDGRID_API_KEY not set. Email notifications disabled.');
}

const app = express();
app.use(express.json());

// If the server is behind a proxy (CRA dev server or other), enable trust proxy
// so express-rate-limit can read the correct client IP from X-Forwarded-For.
// This is safe for local development; in production set this to the appropriate
// value (e.g. the number of trusted proxies or a specific IP/range).
app.set('trust proxy', 1);

// Important: set CLAUDE_KEY in your shell before starting the server:
// export CLAUDE_KEY="sk_..."
const CLAUDE_KEY = process.env.CLAUDE_KEY;
if (!CLAUDE_KEY) {
  console.warn('Warning: CLAUDE_KEY not set. Proxy requests will fail until you set the environment variable.');
}

// Basic per-IP rate limiter to protect your credits during development
const limiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 200, // limit each IP to 200 requests per windowMs
});
app.use('/api/', limiter);

app.post('/api/claude', async (req, res) => {
  try {
    // Debug: log minimal request info
    console.debug('Proxy /api/claude from ip=', req.ip, 'bodyKeys=', Object.keys(req.body || {}));

    // Check if client sent a full Anthropic API request (with model, messages, system, etc.)
    // If so, forward it directly. Otherwise, construct a simple request.
    let requestBody;

    if (req.body && req.body.model && req.body.messages) {
      // Client sent full API request - forward it as-is
      console.debug('Proxy: forwarding full client request with model=', req.body.model);
      requestBody = req.body;
    } else {
      // Legacy/simple format - construct basic request
      let input = req.body && req.body.input;
      if (!input && req.body && Array.isArray(req.body.messages) && req.body.messages.length > 0) {
        const first = req.body.messages.find(m => m && (m.content || m.text));
        if (first) input = first.content || first.text;
      }

      if (!input) {
        console.warn('Proxy: missing input in request body keys=', Object.keys(req.body || {}));
        return res.status(400).json({ error: 'missing input' });
      }

      const MODEL = process.env.CLAUDE_MODEL || 'claude-sonnet-4-20250514';
      console.debug('Proxy: constructing simple request with model=', MODEL);

      requestBody = {
        model: MODEL,
        max_tokens: 1024,
        messages: [{ role: 'user', content: input }]
      };
    }

    // Forward to Anthropic Claude API
    const resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': CLAUDE_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify(requestBody)
    });

    const text = await resp.text();
    res.status(resp.status).send(text);
  } catch (err) {
    console.error('Proxy error', err);
    res.status(500).json({ error: 'proxy_error', detail: String(err) });
  }
});

// Health endpoint for quick checks
app.get('/health', (req, res) => {
  res.json({ status: 'ok', ts: Date.now(), model: process.env.CLAUDE_MODEL || null });
});

const port = process.env.PORT || 4000;
app.listen(port, () => console.log(`Proxy listening on http://localhost:${port}`));
