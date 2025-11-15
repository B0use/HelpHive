/**
 * Claude API integration for parsing and categorizing user requests
 */

const CLAUDE_API_URL = 'https://api.anthropic.com/v1/messages';
const CLAUDE_API_KEY = process.env.REACT_APP_CLAUDE_API_KEY;

/**
 * Process user request (text, voice transcript, or photo description) using Claude API
 * @param {string} input - Text input, voice transcript, or photo description
 * @param {string} inputType - 'text', 'voice', or 'photo'
 * @returns {Promise<Object>} Parsed request with title, description, category, and urgency
 */
export const processRequestWithClaude = async (input, inputType = 'text') => {
  if (!CLAUDE_API_KEY) {
    console.error('Claude API key not configured');
    return {
      title: 'Help Request',
      description: input,
      category: 'general',
      urgencyLevel: 'medium'
    };
  }

  const systemPrompt = `You are an AI assistant helping to parse and categorize help requests from elderly or differently-abled citizens. 
Analyze the request and provide:
1. A clear, concise title (max 50 characters)
2. A detailed description
3. A category (medical, transportation, shopping, household, companionship, technology, other)
4. An urgency level (low, medium, high, emergency)

Consider:
- Medical issues or health concerns = emergency or high
- Transportation needs = medium to high
- Shopping/errands = low to medium
- Household tasks = low to medium
- Social isolation = medium
- Technology help = low to medium

Return a JSON object with: title, description, category, urgencyLevel`;

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
        model: 'claude-3-sonnet-20240229',
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
      throw new Error(`Claude API error: ${response.statusText}`);
    }

    const data = await response.json();
    const content = data.content[0].text;
    
    // Try to parse JSON from Claude's response
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (e) {
      console.warn('Could not parse JSON from Claude response', e);
    }

    // Fallback: extract information from text response
    return {
      title: extractTitle(content) || 'Help Request',
      description: input,
      category: extractCategory(content) || 'general',
      urgencyLevel: extractUrgency(content) || 'medium'
    };
  } catch (error) {
    console.error('Error processing request with Claude:', error);
    // Fallback response
    return {
      title: 'Help Request',
      description: input,
      category: 'general',
      urgencyLevel: 'medium'
    };
  }
};

/**
 * Prioritize tasks using Claude API
 * @param {Array} tasks - Array of task objects
 * @returns {Promise<Array>} Sorted tasks by priority
 */
export const prioritizeTasks = async (tasks) => {
  if (!CLAUDE_API_KEY || tasks.length === 0) {
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

    const data = await response.json();
    const content = data.content[0].text;
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    
    if (jsonMatch) {
      const priorityIds = JSON.parse(jsonMatch[0]);
      // Sort tasks based on priority order
      const taskMap = new Map(tasks.map(t => [t.requestId || t.id, t]));
      return priorityIds.map(id => taskMap.get(id)).filter(Boolean);
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

