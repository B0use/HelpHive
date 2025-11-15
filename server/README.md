Local Claude proxy for development

Run this server locally to avoid CORS issues and keep your Claude API key off the browser.

Setup

1. Install dependencies:

```bash
cd server
npm install
```

2. Set your Claude key in the shell (do NOT commit this):

```bash
export CLAUDE_KEY="sk_your_real_key_here"
```

3. Start the server:

```bash
npm start
```

The server listens on http://localhost:4000 and exposes POST /api/claude which forwards to Anthropic.

During development the CRA dev server is configured to proxy /api requests to this server (see root package.json proxy). Use `/api/claude` as the client endpoint.
