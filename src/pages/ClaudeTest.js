import React, { useState } from 'react';
import { processRequestWithClaude } from '../config/claude';
import './ClaudeTest.css';

const ClaudeTest = () => {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const testExamples = [
    "I need help getting groceries this week, I can't drive",
    "Urgent! I fell and hurt my leg, need to get to the hospital",
    "My computer stopped working and I need help setting up video calls with my doctor",
    "I need someone to help me move some heavy furniture in my living room",
    "Feeling very lonely, would love someone to visit and chat",
    "Need help with house cleaning, especially the bathroom and kitchen"
  ];

  const handleTest = async () => {
    if (!input.trim()) {
      setError('Please enter a description to test');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const processed = await processRequestWithClaude(input, 'text');
      setResult({
        original: input,
        processed: processed
      });
    } catch (err) {
      console.error('Test error:', err);
      setError(err.message || 'Failed to process request');
    } finally {
      setLoading(false);
    }
  };

  const handleExample = (example) => {
    setInput(example);
  };

  return (
    <div className="claude-test-page">
      <header className="page-header">
        <h1>Claude API Test</h1>
        <p>Test how Claude parses and enhances user requests</p>
      </header>

      <main className="claude-test-container">
        <div className="test-section card">
          <h2>Input</h2>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Enter a help request description..."
            rows={6}
            className="test-input"
          />
          
          <div className="test-actions">
            <button
              onClick={handleTest}
              disabled={loading || !input.trim()}
              className="btn btn-primary"
            >
              {loading ? 'Processing...' : 'Test Claude Parsing'}
            </button>
          </div>

          <div className="examples-section">
            <h3>Example Requests</h3>
            <div className="examples-list">
              {testExamples.map((example, index) => (
                <button
                  key={index}
                  onClick={() => handleExample(example)}
                  className="example-btn"
                >
                  {example}
                </button>
              ))}
            </div>
          </div>
        </div>

        {error && (
          <div className="error-section card">
            <h2>Error</h2>
            <div className="error-message">{error}</div>
          </div>
        )}

        {result && (
          <div className="result-section card">
            <h2>Claude Processing Results</h2>
            
            <div className="result-comparison">
              <div className="original">
                <h3>Original Input</h3>
                <div className="text-box">{result.original}</div>
              </div>

              <div className="processed">
                <h3>Processed by Claude</h3>
                <div className="processed-details">
                  <div className="detail-item">
                    <strong>Title:</strong>
                    <span>{result.processed.title}</span>
                  </div>
                  
                  <div className="detail-item">
                    <strong>Description:</strong>
                    <div className="text-box">{result.processed.description}</div>
                  </div>
                  
                  <div className="detail-item">
                    <strong>Category:</strong>
                    <span className="badge category-badge">{result.processed.category}</span>
                  </div>
                  
                  <div className="detail-item">
                    <strong>Urgency Level:</strong>
                    <span className={`badge urgency-badge urgency-${result.processed.urgencyLevel}`}>
                      {result.processed.urgencyLevel}
                    </span>
                  </div>
                  
                  <div className="detail-item">
                    <strong>People Needed:</strong>
                    <span className="badge people-badge">
                      {result.processed.peopleNeeded || 1}
                    </span>
                  </div>
                  
                  <div className="detail-item">
                    <strong>Task Types:</strong>
                    <div className="task-types">
                      {(result.processed.taskTypes || []).map((task, idx) => (
                        <span key={idx} className="badge task-badge">
                          {task}
                        </span>
                      ))}
                      {(!result.processed.taskTypes || result.processed.taskTypes.length === 0) && (
                        <span className="no-tasks">No specific tasks identified</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default ClaudeTest;

