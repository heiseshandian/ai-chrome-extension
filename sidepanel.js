// Side panel logic

const providerSelect = document.getElementById('provider-select');
const apiKeyInput = document.getElementById('api-key');
const saveConfigBtn = document.getElementById('save-config');
const testConnectionBtn = document.getElementById('test-connection');
const connectionStatus = document.getElementById('connection-status');
const chatMessages = document.getElementById('chat-messages');
const userInput = document.getElementById('user-input');
const sendMessageBtn = document.getElementById('send-message');
const clearChatBtn = document.getElementById('clear-chat');

let currentProvider = '';
let apiKey = '';
let conversationHistory = [];

// Load saved configuration
chrome.storage.local.get(['provider', 'apiKey', 'conversationHistory'], (result) => {
  if (result.provider) {
    currentProvider = result.provider;
    providerSelect.value = result.provider;
  }
  if (result.apiKey) {
    apiKey = result.apiKey;
    apiKeyInput.value = result.apiKey;
  }
  if (result.conversationHistory) {
    conversationHistory = result.conversationHistory;
    renderChatHistory();
  }
});

// Save configuration
saveConfigBtn.addEventListener('click', () => {
  currentProvider = providerSelect.value;
  apiKey = apiKeyInput.value;

  if (!currentProvider || !apiKey) {
    showStatus('Please select a provider and enter an API key', 'error');
    return;
  }

  chrome.storage.local.set({ provider: currentProvider, apiKey: apiKey }, () => {
    showStatus('Configuration saved successfully!', 'success');
  });
});

// Test connection
testConnectionBtn.addEventListener('click', async () => {
  if (!currentProvider || !apiKey) {
    showStatus('Please save configuration first', 'error');
    return;
  }

  showStatus('Testing connection...', 'success');

  try {
    const testResult = await testConnection(currentProvider, apiKey);
    if (testResult.success) {
      showStatus('Connection successful!', 'success');
    } else {
      showStatus(`Connection failed: ${testResult.error}`, 'error');
    }
  } catch (error) {
    showStatus(`Connection failed: ${error.message}`, 'error');
  }
});

// Send message
sendMessageBtn.addEventListener('click', () => {
  sendMessage();
});

userInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});

// Clear chat
clearChatBtn.addEventListener('click', () => {
  conversationHistory = [];
  chatMessages.innerHTML = '';
  chrome.storage.local.set({ conversationHistory: [] });
});

// Listen for messages from background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'SEND_TO_AI') {
    userInput.value = message.text;
    sendMessage();
  }
});

// Helper functions

function showStatus(message, type) {
  connectionStatus.textContent = message;
  connectionStatus.className = `status-message ${type}`;
  setTimeout(() => {
    connectionStatus.className = 'status-message';
  }, 5000);
}

function renderChatHistory() {
  chatMessages.innerHTML = '';
  conversationHistory.forEach(msg => {
    addMessageToChat(msg.role, msg.content);
  });
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function addMessageToChat(role, content) {
  const messageDiv = document.createElement('div');
  messageDiv.className = `message ${role}`;

  const roleDiv = document.createElement('div');
  roleDiv.className = 'role';
  roleDiv.textContent = role === 'user' ? 'You' : 'AI';

  const contentDiv = document.createElement('div');
  contentDiv.className = 'content';
  contentDiv.textContent = content;

  messageDiv.appendChild(roleDiv);
  messageDiv.appendChild(contentDiv);
  chatMessages.appendChild(messageDiv);

  chatMessages.scrollTop = chatMessages.scrollHeight;
}

async function sendMessage() {
  const message = userInput.value.trim();

  if (!message) {
    return;
  }

  if (!currentProvider || !apiKey) {
    showStatus('Please configure your API settings first', 'error');
    return;
  }

  // Add user message to chat
  conversationHistory.push({ role: 'user', content: message });
  addMessageToChat('user', message);
  userInput.value = '';

  // Disable send button
  sendMessageBtn.disabled = true;
  sendMessageBtn.textContent = 'Sending...';

  try {
    const response = await callAIProvider(currentProvider, apiKey, message);

    // Add AI response to chat
    conversationHistory.push({ role: 'assistant', content: response });
    addMessageToChat('assistant', response);

    // Save conversation history
    chrome.storage.local.set({ conversationHistory: conversationHistory });
  } catch (error) {
    showStatus(`Error: ${error.message}`, 'error');
    conversationHistory.pop(); // Remove user message if failed
  } finally {
    sendMessageBtn.disabled = false;
    sendMessageBtn.textContent = 'Send';
  }
}

async function testConnection(provider, key) {
  try {
    switch (provider) {
      case 'claude':
        return await testClaude(key);
      case 'gemini':
        return await testGemini(key);
      case 'chatgpt':
        return await testChatGPT(key);
      default:
        return { success: false, error: 'Unknown provider' };
    }
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function callAIProvider(provider, key, message) {
  switch (provider) {
    case 'claude':
      return await callClaude(key, message);
    case 'gemini':
      return await callGemini(key, message);
    case 'chatgpt':
      return await callChatGPT(key, message);
    default:
      throw new Error('Unknown provider');
  }
}

// Claude (Anthropic) API
async function testClaude(apiKey) {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 10,
      messages: [{ role: 'user', content: 'Hi' }]
    })
  });

  if (response.ok) {
    return { success: true };
  } else {
    const error = await response.json();
    return { success: false, error: error.error?.message || 'Unknown error' };
  }
}

async function callClaude(apiKey, message) {
  const messages = conversationHistory
    .filter(msg => msg.role !== 'system')
    .map(msg => ({
      role: msg.role,
      content: msg.content
    }));

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 4096,
      messages: messages
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to get response from Claude');
  }

  const data = await response.json();
  return data.content[0].text;
}

// Gemini (Google) API
async function testGemini(apiKey) {
  // First, try to list available models
  try {
    const listResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
    if (listResponse.ok) {
      const models = await listResponse.json();
      console.log('Available Gemini models:', models);

      // Find a model that supports generateContent
      if (models.models && models.models.length > 0) {
        for (const modelInfo of models.models) {
          if (modelInfo.supportedGenerationMethods &&
              modelInfo.supportedGenerationMethods.includes('generateContent')) {
            const modelName = modelInfo.name.replace('models/', '');
            console.log('Testing model:', modelName);

            // Test this model
            const testResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                contents: [{ parts: [{ text: 'Hi' }] }]
              })
            });

            if (testResponse.ok) {
              console.log('Successfully connected with model:', modelName);
              chrome.storage.local.set({ geminiModel: modelName });
              return { success: true };
            } else {
              const errorData = await testResponse.json();
              console.log(`Model ${modelName} failed:`, errorData);
            }
          }
        }
      }
    }
  } catch (e) {
    console.error('Error listing models:', e);
  }

  return { success: false, error: 'No compatible Gemini model found. Check browser console for details.' };
}

async function callGemini(apiKey, message) {
  // Get the working model from storage, or use default
  const result = await chrome.storage.local.get(['geminiModel']);
  const model = result.geminiModel || 'gemini-2.0-flash-exp';

  const contents = conversationHistory.map(msg => ({
    role: msg.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: msg.content }]
  }));

  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      contents: contents
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to get response from Gemini');
  }

  const data = await response.json();
  return data.candidates[0].content.parts[0].text;
}

// ChatGPT (OpenAI) API
async function testChatGPT(apiKey) {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: 'Hi' }],
      max_tokens: 10
    })
  });

  if (response.ok) {
    return { success: true };
  } else {
    const error = await response.json();
    return { success: false, error: error.error?.message || 'Unknown error' };
  }
}

async function callChatGPT(apiKey, message) {
  const messages = conversationHistory.map(msg => ({
    role: msg.role,
    content: msg.content
  }));

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages: messages
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to get response from ChatGPT');
  }

  const data = await response.json();
  return data.choices[0].message.content;
}
