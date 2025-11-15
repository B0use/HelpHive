/* eslint-env jest */

describe('claude client-side quota and cache', () => {
  beforeEach(() => {
    // Ensure environment is reset so module re-reads process.env on import
    jest.resetModules();
    localStorage.clear();
    global.fetch = undefined;
  });

  test('caches responses to avoid duplicate calls', async () => {
    process.env.REACT_APP_CLAUDE_API_KEY = 'testkey';
    process.env.REACT_APP_CLAUDE_MAX_CALLS_PER_HOUR = '10';
    process.env.REACT_APP_CLAUDE_MAX_CALLS_PER_DAY = '100';

    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        content: [
          { text: JSON.stringify({ title: 'Cached', description: 'd', category: 'general', urgencyLevel: 'low', peopleNeeded: 1, taskTypes: [] }) }
        ]
      })
    });

    global.fetch = fetchMock;

    const { processRequestWithClaude } = require('./claude');

    const a = await processRequestWithClaude('please help me', 'text');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(a.title).toBe('Cached');

    const b = await processRequestWithClaude('please help me', 'text');
    // second call should be served from cache (no additional fetch)
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(b.title).toBe('Cached');
  });

  test('enforces hourly quota and returns fallback when exceeded', async () => {
    process.env.REACT_APP_CLAUDE_API_KEY = 'testkey';
    process.env.REACT_APP_CLAUDE_MAX_CALLS_PER_HOUR = '1';
    process.env.REACT_APP_CLAUDE_MAX_CALLS_PER_DAY = '100';

    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        content: [
          { text: JSON.stringify({ title: 'First', description: 'd', category: 'general', urgencyLevel: 'low', peopleNeeded: 1, taskTypes: [] }) }
        ]
      })
    });

    global.fetch = fetchMock;

    const { processRequestWithClaude } = require('./claude');

    const first = await processRequestWithClaude('input1', 'text');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(first.title).toBe('First');

  // different input should hit quota and NOT call fetch again
  const second = await processRequestWithClaude('input2', 'text');
  expect(fetchMock).toHaveBeenCalledTimes(1);
  // fallback should still produce a normalized title derived from input
  expect(second.title).toBe('Input2');
  });

  test('heuristics: infer urgency and people needed from text', async () => {
    // import heuristics
    const { inferUrgencyFromText, inferPeopleNeededFromText } = require('./claude');

    expect(inferUrgencyFromText('I need help ASAP, please hurry', '')).toBe('Urgent');
    expect(inferUrgencyFromText('Whenever you have time next week is fine', '')).toBe('Non-Urgent');
    expect(inferUrgencyFromText('Can someone come tomorrow within 24 hours?', '')).toBe('Urgent');

    expect(inferPeopleNeededFromText('I am moving lots of furniture and need help', 1)).toBe('multiple');
    expect(inferPeopleNeededFromText('Need two volunteers to carry a sofa', 1)).toBe(2);
    expect(inferPeopleNeededFromText('Just need someone to pick up groceries', 1)).toBe(1);
  });

  test('rephrase: concise title and paraphrased description', () => {
    const { makeConciseTitle, paraphraseDescription } = require('./claude');

  const title = makeConciseTitle('please help me move lots of furniture from my living room');
  // title should mention the action or object (move/moving/furniture)
  expect(title.toLowerCase()).toMatch(/move|moving|furnit/);

    const p = paraphraseDescription('i need someone to pick up groceries asap');
    expect(p).toMatch(/as soon as possible/i);
    expect(p.charAt(0)).toMatch(/[A-Z]/);
    expect(p.endsWith('.') || p.endsWith('!') || p.endsWith('?')).toBe(true);
  });
});
