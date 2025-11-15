/**
 * Claude API integration for parsing and categorizing user requests
 *
 * NOTE: To reduce accidental credit usage, this module implements a lightweight
 * client-side quota and cache. This is not a replacement for a server-side
 * proxy or proper billing controls, but it helps avoid repeated calls from the
 * same browser/session and enforces simple hourly/daily limits configurable
 * via environment variables.
 */

// Prefer an explicit proxy URL set in env, otherwise during development default
// to a local relative proxy path '/api/claude' (CRA dev server can proxy to it).
const CLAUDE_API_URL = process.env.REACT_APP_CLAUDE_PROXY_URL || (process.env.NODE_ENV === 'development' ? '/api/claude' : 'https://api.anthropic.com/v1/messages');
const CLAUDE_API_KEY = process.env.REACT_APP_CLAUDE_API_KEY;

// Quota config (set via env, defaults are conservative)
const MAX_CALLS_PER_HOUR = parseInt(process.env.REACT_APP_CLAUDE_MAX_CALLS_PER_HOUR, 10) || 10;
const MAX_CALLS_PER_DAY = parseInt(process.env.REACT_APP_CLAUDE_MAX_CALLS_PER_DAY, 10) || 100;

// localStorage key for usage tracking and simple response cache
const STORAGE_KEY = 'helphive_claude_usage_v1';

function nowMs() {
  return Date.now();
}

function loadUsage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) {
    return null;
  }
}

function saveUsage(obj) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(obj));
  } catch (e) {
    // ignore storage failures
  }
}

function initUsage() {
  const now = nowMs();
  const dailyReset = now + 24 * 60 * 60 * 1000;
  const hourReset = now + 60 * 60 * 1000;
  const obj = {
    dailyCount: 0,
    hourlyCount: 0,
    dailyReset,
    hourReset,
    cache: {} // simple cache by input hash
  };
  saveUsage(obj);
  return obj;
}

function getUsage() {
  let u = loadUsage();
  if (!u) return initUsage();
  const now = nowMs();
  if (!u.dailyReset || now > u.dailyReset) {
    u.dailyCount = 0;
    u.dailyReset = now + 24 * 60 * 60 * 1000;
  }
  if (!u.hourReset || now > u.hourReset) {
    u.hourlyCount = 0;
    u.hourReset = now + 60 * 60 * 1000;
  }
  // ensure cache exists
  if (!u.cache) u.cache = {};
  return u;
}

function incrementUsage() {
  const u = getUsage();
  u.dailyCount = (u.dailyCount || 0) + 1;
  u.hourlyCount = (u.hourlyCount || 0) + 1;
  saveUsage(u);
}

function isQuotaExceeded() {
  const u = getUsage();
  return u.hourlyCount >= MAX_CALLS_PER_HOUR || u.dailyCount >= MAX_CALLS_PER_DAY;
}

function cacheGet(key) {
  const u = getUsage();
  return u.cache && u.cache[key];
}

function cacheSet(key, value) {
  const u = getUsage();
  u.cache = u.cache || {};
  // keep cache small: store up to 50 recent entries
  const keys = Object.keys(u.cache || {});
  if (keys.length > 50) {
    // drop the oldest
    delete u.cache[keys[0]];
  }
  u.cache[key] = { ts: nowMs(), value };
  saveUsage(u);
}

function hashInput(input, inputType) {
  // simple hash using JSON stringify - not cryptographic but fine for cache key
  return `${inputType}::${input}`;
}

/**
 * Process user request (text, voice transcript, or photo description) using Claude API
 * If quota is exceeded or CLAUDE_API_KEY is missing, returns a safe fallback.
 */
export const processRequestWithClaude = async (input, inputType = 'text') => {
  // quick fallback when no API key
  if (!CLAUDE_API_KEY) {
    console.warn('Claude API key not configured - using local fallback');
    // Use local normalization/rephrasing so title/description are improved even without API
    const parsed = {
      title: '',
      description: input,
      category: 'general',
      urgencyLevel: 'medium',
      peopleNeeded: 1,
      taskTypes: []
    };
    return normalizeParsed(parsed, input);
  }

  // If quota exceeded, skip network call and return fallback
  if (isQuotaExceeded()) {
    console.warn('Claude API quota exceeded for this browser/session - using fallback');
    const parsed = {
      title: '',
      description: input,
      category: 'general',
      urgencyLevel: 'medium',
      peopleNeeded: 1,
      taskTypes: []
    };
    return normalizeParsed(parsed, input);
  }

  const key = hashInput(input, inputType);
  const cached = cacheGet(key);
  if (cached && cached.value) {
    // Use cached parsed response to avoid duplicate calls
    return cached.value;
  }

  // Debug: surface minimal info in console to help diagnose integration issues
  try {
    // don't print the key value itself
    console.debug('Claude debug:', {
      url: CLAUDE_API_URL,
      hasKey: !!CLAUDE_API_KEY,
      keyLength: CLAUDE_API_KEY ? CLAUDE_API_KEY.length : 0,
      inputSample: input && input.slice(0, 120)
    });
  } catch (e) {
    // ignore
  }

  const systemPrompt = `You are an AI assistant helping to parse and categorize help requests from elderly or differently-abled citizens.

Your job is to read the user’s request and return a *single JSON object* with:
- title
- description
- category
- urgencyLevel
- peopleNeeded
- taskTypes

### Title rules (VERY IMPORTANT)
- Make the title a **short, precise label**, NOT a full sentence.
- Use a **noun phrase** of about **2–5 words**.
- Summarize the **core need or situation**, not the emotions.
- Do NOT copy the whole user message.
- Remove extra details like time and location unless they are essential.
- Examples:
  - "My dog is missing and I miss him so much please somebody find him. I lost him 2 hours ago near a park"
    → title: "Missing dog" or "Missing pet"
  - "Can someone help me carry my groceries up the stairs?"
    → title: "Carry groceries upstairs"
  - "I need someone to drive me to the clinic tomorrow"
    → title: "Clinic ride" or "Medical transport"
  - "My internet is not working, I don't understand the router"
    → title: "Wi-Fi troubleshooting"

### Description
- Write a clear, complete, polite paragraph that explains:
  - what help is needed,
  - any key details (when, where, special constraints),
  - anything volunteers should know.
- You may expand and clean up the user’s original text, but keep the meaning.

### Category
Choose one of:
- "medical"
- "transportation"
- "shopping"
- "household"
- "companionship"
- "technology"
- "other"

### Urgency level
Choose one of:
- "low"
- "medium"
- "high"
- "emergency"

### People needed
- Return a number: 1, 2, 3, or the string "multiple" (for 4+).
- Estimate based on effort: heavy lifting or moving furniture often needs 2 or "multiple"; simple visits or phone calls usually need 1.

### Task types
- Return an **array of short strings** describing specific task types.
- Examples:
  - ["grocery shopping", "carrying bags"]
  - ["heavy lifting", "moving furniture"]
  - ["medical transport", "clinic appointment"]
  - ["phone check-in", "companionship"]

### Output format
Return **ONLY** a JSON object, with exactly these keys:
{
  "title": "...",
  "description": "...",
  "category": "...",
  "urgencyLevel": "...",
  "peopleNeeded": 1,
  "taskTypes": ["...", "..."]
}
AVOID: include any extra text, explanations, or markdown—only the JSON object.`;

  const userPrompt = `Input type: ${inputType}\n\nUser request: ${input}\n\nParse this request and return the JSON object.`;

  try {
    const response = await fetch(CLAUDE_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': CLAUDE_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        system: systemPrompt,
        messages: [
          {
            role: 'user',
            content: userPrompt
          }
        ]
      })
    });

    if (!response.ok) {
      // Throw with status so caller can inspect
      const txt = await response.text().catch(() => response.statusText);
      throw new Error(`Claude API error: ${response.status} ${txt}`);
    }

    // increment quota only on successful network call
    incrementUsage();

    const data = await response.json();
    const content = (data.content && data.content[0] && data.content[0].text) || '';

    // Try to parse JSON from Claude's response
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        const normalized = normalizeParsed(parsed, input);
        cacheSet(key, normalized);
        return normalized;
      }
    } catch (e) {
      console.warn('Could not parse JSON from Claude response', e);
    }

    // Fallback: extract information from text response
    const fallback = {
      title: extractTitle(content) || 'Help Request',
      description: input, // Use original if parsing fails
      category: extractCategory(content) || 'general',
      urgencyLevel: extractUrgency(content) || 'medium',
      peopleNeeded: extractPeopleNeeded(content) || 1,
      taskTypes: extractTaskTypes(content) || []
    };
    const normalizedFallback = normalizeParsed(fallback, input);
    cacheSet(key, normalizedFallback);
    return normalizedFallback;
  } catch (error) {
    console.error('Error processing request with Claude:', error);
    // Fallback response
    const parsed = {
      title: '',
      description: input,
      category: 'general',
      urgencyLevel: 'medium',
      peopleNeeded: 1,
      taskTypes: []
    };
    return normalizeParsed(parsed, input);
  }
};

/**
 * Prioritize tasks using Claude API
 * This also respects the same quota/caching mechanism to avoid costly calls.
 */
export const prioritizeTasks = async (tasks) => {
  if (!CLAUDE_API_KEY || tasks.length === 0) {
    return tasks;
  }

  if (isQuotaExceeded()) {
    console.warn('Claude API quota exceeded for this browser/session - returning original tasks order');
    return tasks;
  }

  const systemPrompt = `You are an AI assistant that prioritizes help requests for elderly and differently-abled citizens.
Sort tasks by urgency, proximity, and user needs. Consider:
- Emergency situations first
- High urgency medical needs
- Time-sensitive requests
- Proximity to volunteers
- User history and needs

Return a JSON array of task IDs in priority order.`;

  const tasksSummary = tasks.map(t => ({
    id: t.requestId || t.id,
    title: t.title,
    urgency: t.urgencyLevel,
    category: t.category,
    distance: t.distance || 'unknown',
    createdAt: t.createdAt
  }));

  const key = `prioritize::${JSON.stringify(tasksSummary)}`;
  const cached = cacheGet(key);
  if (cached && cached.value) {
    return cached.value;
  }

  // Debug: minimal info
  try {
    console.debug('Claude prioritize debug:', { count: tasks.length, hasKey: !!CLAUDE_API_KEY });
  } catch (e) {}

  try {
    const response = await fetch(CLAUDE_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': CLAUDE_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-sonnet-20240229',
        max_tokens: 512,
        system: systemPrompt,
        messages: [
          {
            role: 'user',
            content: `Prioritize these tasks:\n\n${JSON.stringify(tasksSummary, null, 2)}`
          }
        ]
      })
    });

    if (!response.ok) {
      return tasks; // Return original order if API fails
    }

    incrementUsage();

    const data = await response.json();
    const content = (data.content && data.content[0] && data.content[0].text) || '';
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    
    if (jsonMatch) {
      const priorityIds = JSON.parse(jsonMatch[0]);
      // Sort tasks based on priority order
      const taskMap = new Map(tasks.map(t => [t.requestId || t.id, t]));
      const ordered = priorityIds.map(id => taskMap.get(id)).filter(Boolean);
      cacheSet(key, ordered);
      return ordered;
    }
  } catch (error) {
    console.error('Error prioritizing tasks:', error);
  }

  return tasks;
};

// Helper functions
function extractTitle(text) {
  const titleMatch = text.match(/title["\s:]+([^",\n]+)/i);
  return titleMatch ? titleMatch[1].trim() : null;
}

function extractCategory(text) {
  const categoryMatch = text.match(/category["\s:]+([^",\n]+)/i);
  return categoryMatch ? categoryMatch[1].trim().toLowerCase() : null;
}

function extractUrgency(text) {
  const urgencyMatch = text.match(/urgencyLevel["\s:]+([^",\n]+)/i);
  return urgencyMatch ? urgencyMatch[1].trim().toLowerCase() : null;
}

function extractPeopleNeeded(text) {
  const peopleMatch = text.match(/peopleNeeded["\s:]+([^",\n\]]+)/i);
  if (peopleMatch) {
    const value = peopleMatch[1].trim().toLowerCase();
    if (value === 'multiple' || value === '"multiple"') return 'multiple';
    const num = parseInt(value);
    return isNaN(num) ? 1 : num;
  }
  return 1;
}

function extractTaskTypes(text) {
  const taskMatch = text.match(/taskTypes["\s:]+\[([^\]]+)\]/i);
  if (taskMatch) {
    try {
      // Try to parse as JSON array
      const arrayStr = '[' + taskMatch[1] + ']';
      return JSON.parse(arrayStr);
    } catch (e) {
      // Fallback: extract quoted strings
      const quoted = taskMatch[1].match(/"([^"]+)"/g);
      return quoted ? quoted.map(s => s.replace(/"/g, '')) : [];
    }
  }
  return [];
}

// Heuristic: infer urgency from free text when Claude's parsed value is missing or ambiguous
function inferUrgencyFromText(text, parsedUrgencyRaw) {
  const t = (text || '').toLowerCase();
  // Strong indicators of urgent/emergency
  if (/\b(emergency|911|life[- ]threat|call 911|immediately|right away|right now|asap|as soon as possible|urgent|hurry|needs immediate|need help now)\b/.test(t)) {
    return 'Urgent';
  }
  // Time-based urgency within hours/days
  if (/\b(today|this morning|this afternoon|within 24|within 48 hours|tomorrow|by tomorrow|by end of day|soon|next few hours)\b/.test(t)) {
    return 'Urgent';
  }
  // Clearly non-urgent phrasing
  if (/\b(next week|in a week|in a few days|within a week|sometime|when you can|whenever)\b/.test(t)) {
    return 'Non-Urgent';
  }

  // Fall back to parsed value mapping if present
  const raw = (parsedUrgencyRaw || '').toString().toLowerCase();
  if (raw.includes('emergency') || raw.includes('high') || raw.includes('urgent')) return 'Urgent';
  if (raw.includes('low') || raw.includes('non')) return 'Non-Urgent';
  if (raw.includes('medium')) return 'Medium';

  return 'Medium';
}

// Heuristic: infer number of people needed from free text
function inferPeopleNeededFromText(text, parsedPeople) {
  const t = (text || '').toLowerCase();

  // If parsed explicitly provides a useful value, prefer it
  if (parsedPeople && parsedPeople !== 1 && parsedPeople !== '1') return parsedPeople;
  if (parsedPeople === 'multiple') return 'multiple';

  // Explicit numeric mentions: '2 people', 'three volunteers'
  const wordToNum = {
    one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10
  };
  const explicit = t.match(/\b(\d+|one|two|three|four|five|six|seven|eight|nine|ten)\b\s+(people|volunteers|helpers|persons|men|women)\b/);
  if (explicit) {
    const num = explicit[1];
    const n = parseInt(num, 10);
    if (!isNaN(n)) return n;
    if (wordToNum[num]) return wordToNum[num];
  }

  // Phrases that indicate a small group or multiple helpers
  if (/\b(several|a few|a lot|lots of|lots|many|multiple|a couple)\b/.test(t)) return 'multiple';

  // Heavy/larger lifting tasks that commonly need two or more people
  if (/\b(heavy|lift|lifting|move|moving|furnit|sofa|mattress|couch|appliance|fridge|refrigerator|piano|bed|boxes|bulk)\b/.test(t)) {
    // If user explicitly says 'moving a lot' or 'lots of furniture', treat as multiple
    if (/\b(lots|a lot|many|several)\b/.test(t)) return 'multiple';
    // default to 2 for typical heavy-lifting needs
    return 2;
  }

  // 'Help me carry' and similar phrases -> 2
  if (/\b(help me carry|help me move|assist me carry|assist me move|need someone to carry)\b/.test(t)) return 2;

  // Default fallback
  return 1;
}

// Export heuristics for unit testing and reuse
export { inferUrgencyFromText, inferPeopleNeededFromText };
/**
 * Normalize parsed response from Claude into a safe, consistent shape
 */
function normalizeParsed(parsed, originalInput = '') {
  const safe = parsed || {};
  // Title: prefer parsed title, otherwise derive from original input
  let title = (safe.title || '').trim();
  if (!title) {
    const snippet = (originalInput || '').trim().replace(/\s+/g, ' ').slice(0, 60);
    title = snippet ? (snippet.charAt(0).toUpperCase() + snippet.slice(1)) : 'Help Request';
  }
  // Truncate to 60 chars and ensure capitalization
  if (title.length > 60) title = title.slice(0, 57) + '...';
  title = title.charAt(0).toUpperCase() + title.slice(1);

  // Rephrase title to concise form
  try {
    title = makeConciseTitle(title || description || originalInput);
  } catch (e) {
    // ignore rephrase failures and keep previous title
  }

  const description = (safe.description && safe.description.trim()) || originalInput || '';

  // Paraphrase description into a nicer, cleaned paragraph
  let paraphrasedDescription = description;
  try {
    paraphrasedDescription = paraphraseDescription(description);
  } catch (e) {
    // fall back to original description
    paraphrasedDescription = description;
  }

  const category = (safe.category || 'general').toLowerCase();

  // Task types
  const taskTypes = Array.isArray(safe.taskTypes) ? safe.taskTypes : [];

  // Map urgency to simple labels: Urgent, Medium, Non-Urgent
  const urgencyRaw = (safe.urgencyLevel || '').toString().toLowerCase();
  // Use heuristic to infer urgency from description/taskTypes when parsed value is missing or ambiguous
  const inferredUrgency = inferUrgencyFromText(description + ' ' + taskTypes.join(' '), urgencyRaw);
  let urgency = inferredUrgency;

  // Heuristic for peopleNeeded: prefer parsed value but infer from text when missing/ambiguous
  let peopleNeeded = safe.peopleNeeded || 1;
  // Normalize numeric/string values
  if (typeof peopleNeeded === 'string') {
    const s = peopleNeeded.toLowerCase();
    if (s === 'multiple') peopleNeeded = 'multiple';
    else {
      const n = parseInt(s, 10);
      peopleNeeded = isNaN(n) ? peopleNeeded : n;
    }
  }
  // Use text heuristics to override or refine
  const inferredPeople = inferPeopleNeededFromText(description + ' ' + taskTypes.join(' '), peopleNeeded);
  peopleNeeded = inferredPeople || peopleNeeded || 1;

  return {
    title,
    description: paraphrasedDescription,
    category,
    urgencyLevel: urgency,
    peopleNeeded,
    taskTypes
  };
}

// Rephrase helpers: concise title and paraphrase description (rule-based, offline)
function makeConciseTitle(text) {
  const s = (text || '').toString().trim();
  if (!s) return 'Help Request';
  // Remove polite phrases and leading verbs
  let t = s.replace(/^please\s+|^can someone\s+|^could someone\s+|^i need help\s+|^help me\s+/i, '');
  // Replace common verb phrases with gerund for titles: 'help me move' -> 'Moving'
  t = t.replace(/\b(help (me|us)\s+)?(to\s+)?(move|carry|lift|transport)\b/i, 'moving');
  // shorten common patterns
  t = t.replace(/\b(need someone to|need help to|need help with)\b/i, '');
  // Keep first clause before punctuation
  const first = t.split(/[\.|!|\n|\?|,]/)[0].trim();
  // Limit to 60 chars
  let title = first.slice(0, 60).trim();
  // Capitalize first letter
  title = title.charAt(0).toUpperCase() + title.slice(1);
  // If title is too generic, fallback
  if (title.length === 0) return 'Help Request';
  return title;
}

function paraphraseDescription(text) {
  const s = (text || '').toString().trim();
  if (!s) return '';
  // Normalize whitespace and punctuation spacing
  let t = s.replace(/\s+/g, ' ');
  // Capitalize first letter of each sentence
  t = t.replace(/(^|[\.\!\?]\s+)([a-z])/g, (m, p1, p2) => p1 + p2.toUpperCase());
  // Ensure sentences end with a period
  if (!/[\.\!\?]$/.test(t)) t = t + '.';
  // Expand a few shorthand words for clarity (simple substitutions)
  t = t.replace(/\bASAP\b/ig, 'as soon as possible');
  // Trim leading/trailing whitespace
  return t.trim();
}

// Export paraphrase helpers for tests
export { makeConciseTitle, paraphraseDescription };

