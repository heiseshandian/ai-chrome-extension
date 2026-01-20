// Side panel logic

const providerSelect = document.getElementById('provider-select');
const apiKeyInput = document.getElementById('api-key');
const proxyUrlInput = document.getElementById('proxy-url');
const saveConfigBtn = document.getElementById('save-config');
const testConnectionBtn = document.getElementById('test-connection');
const connectionStatus = document.getElementById('connection-status');
const chatMessages = document.getElementById('chat-messages');
const userInput = document.getElementById('user-input');
const clearChatBtn = document.getElementById('clear-chat');
const configHeader = document.getElementById('config-header');
const configContent = document.getElementById('config-content');
const toggleIcon = document.querySelector('.toggle-icon');

let currentProvider = '';
let apiKey = '';
let proxyUrl = '';
let conversationHistory = [];
let apiKeys = {}; // Store API keys per provider

// Set initial collapsed state
configContent.classList.add('collapsed');
toggleIcon.classList.add('collapsed');

// Toggle configuration section
configHeader.addEventListener('click', () => {
  configContent.classList.toggle('collapsed');
  toggleIcon.classList.toggle('collapsed');
});

// Load saved configuration
chrome.storage.local.get(['provider', 'apiKeys', 'proxyUrl', 'conversationHistory'], (result) => {
  if (result.provider) {
    currentProvider = result.provider;
    providerSelect.value = result.provider;
  }
  if (result.apiKeys) {
    apiKeys = result.apiKeys;
    // Load API key for current provider
    if (currentProvider && apiKeys[currentProvider]) {
      apiKey = apiKeys[currentProvider];
      apiKeyInput.value = apiKeys[currentProvider];
    }
  }
  if (result.proxyUrl) {
    proxyUrl = result.proxyUrl;
    proxyUrlInput.value = result.proxyUrl;
  }
  if (result.conversationHistory) {
    conversationHistory = result.conversationHistory;
    renderChatHistory();
  }
});

// Handle provider change
providerSelect.addEventListener('change', () => {
  const selectedProvider = providerSelect.value;
  // Load cached API key for the selected provider
  if (apiKeys[selectedProvider]) {
    apiKeyInput.value = apiKeys[selectedProvider];
  } else {
    apiKeyInput.value = '';
  }
});

// Save configuration
saveConfigBtn.addEventListener('click', () => {
  currentProvider = providerSelect.value;
  apiKey = apiKeyInput.value;
  proxyUrl = proxyUrlInput.value.trim();

  if (!currentProvider || !apiKey) {
    showStatus('Please select a provider and enter an API key', 'error');
    return;
  }

  // Save API key for the current provider
  apiKeys[currentProvider] = apiKey;

  chrome.storage.local.set({
    provider: currentProvider,
    apiKeys: apiKeys,
    proxyUrl: proxyUrl
  }, () => {
    showStatus('Configuration saved successfully!', 'success');
  });
});

// Test connection
testConnectionBtn.addEventListener('click', async () => {
  // Get current values from inputs (not saved values)
  const provider = providerSelect.value;
  const key = apiKeyInput.value;

  if (!provider || !key) {
    showStatus('Please select a provider and enter an API key', 'error');
    return;
  }

  showStatus('Testing connection...', 'success');

  try {
    const testResult = await testConnection(provider, key);
    if (testResult.success) {
      showStatus('Connection successful!', 'success');
    } else {
      showStatus(`Connection failed: ${testResult.error}`, 'error');
    }
  } catch (error) {
    showStatus(`Connection failed: ${error.message}`, 'error');
  }
});

// Send message on Enter key
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

function formatMarkdown(text) {
  // Convert markdown-style formatting to HTML
  let formatted = text;

  // Bold text: **text** or __text__
  formatted = formatted.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  formatted = formatted.replace(/__(.+?)__/g, '<strong>$1</strong>');

  // Italic text: *text* or _text_
  formatted = formatted.replace(/\*(.+?)\*/g, '<em>$1</em>');
  formatted = formatted.replace(/_(.+?)_/g, '<em>$1</em>');

  // Code blocks: ```code```
  formatted = formatted.replace(/```(.+?)```/gs, '<pre><code>$1</code></pre>');

  // Inline code: `code`
  formatted = formatted.replace(/`(.+?)`/g, '<code>$1</code>');

  // Convert newlines to <br> for better spacing
  formatted = formatted.replace(/\n/g, '<br>');

  // Convert bullet points
  formatted = formatted.replace(/^\* (.+)$/gm, '<li>$1</li>');
  formatted = formatted.replace(/^- (.+)$/gm, '<li>$1</li>');

  // Wrap consecutive <li> tags in <ul>
  formatted = formatted.replace(/(<li>.*?<\/li>)(\s*<li>.*?<\/li>)*/g, (match) => {
    return '<ul>' + match + '</ul>';
  });

  return formatted;
}

function addMessageToChat(role, content, messageId = null) {
  const messageDiv = document.createElement('div');
  messageDiv.className = `message ${role}`;
  if (messageId) {
    messageDiv.id = messageId;
  }

  const roleDiv = document.createElement('div');
  roleDiv.className = 'role';
  roleDiv.textContent = role === 'user' ? 'You' : 'AI';

  const contentDiv = document.createElement('div');
  contentDiv.className = 'content';

  // Use HTML formatting for AI messages, plain text for user messages
  if (role === 'assistant') {
    contentDiv.innerHTML = formatMarkdown(content);
  } else {
    contentDiv.textContent = content;
  }

  messageDiv.appendChild(roleDiv);
  messageDiv.appendChild(contentDiv);
  chatMessages.appendChild(messageDiv);

  chatMessages.scrollTop = chatMessages.scrollHeight;
  return messageDiv;
}

function updateMessageContent(messageId, content) {
  const messageDiv = document.getElementById(messageId);
  if (messageDiv) {
    const contentDiv = messageDiv.querySelector('.content');
    if (contentDiv) {
      // Use HTML formatting for streaming AI responses
      contentDiv.innerHTML = formatMarkdown(content);
      chatMessages.scrollTop = chatMessages.scrollHeight;
    }
  }
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

  // Disable input while sending
  userInput.disabled = true;
  userInput.placeholder = 'Sending...';

  // Create AI message placeholder with unique ID
  const messageId = `msg-${Date.now()}`;
  addMessageToChat('assistant', '', messageId);

  let fullResponse = '';

  try {
    // Use streaming if supported
    await streamAIProvider(currentProvider, apiKey, (chunk) => {
      fullResponse += chunk;
      updateMessageContent(messageId, fullResponse);
    });

    // Add AI response to chat history
    conversationHistory.push({ role: 'assistant', content: fullResponse });

    // Save conversation history
    chrome.storage.local.set({ conversationHistory: conversationHistory });
  } catch (error) {
    showStatus(`Error: ${error.message}`, 'error');
    conversationHistory.pop(); // Remove user message if failed

    // Remove the placeholder message
    const msgDiv = document.getElementById(messageId);
    if (msgDiv) {
      msgDiv.remove();
    }
  } finally {
    userInput.disabled = false;
    userInput.placeholder = 'Type your message or use context menu to send selected text... (Press Enter to send)';
  }
}

async function testConnection(provider, key) {
  try {
    switch (provider) {
      case 'claude':
        return await testClaude(key);
      case 'gemini':
        return await testGemini(key);
      default:
        return { success: false, error: 'Unknown provider' };
    }
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Helper function for proxy-aware fetch
function proxyFetch(url, options = {}) {
  if (proxyUrl) {
    // Note: Due to CORS and browser limitations, true proxy support requires a proxy server
    // that handles CORS headers. This is a placeholder for the configuration.
    // Users should set up a local proxy server (like http://localhost:7890) that forwards requests
    console.log(`Using proxy: ${proxyUrl} for ${url}`);
  }
  return fetch(url, options);
}

async function streamAIProvider(provider, key, onChunk) {
  switch (provider) {
    case 'claude':
      return await streamClaude(key, onChunk);
    case 'gemini':
      return await streamGemini(key, onChunk);
    default:
      throw new Error('Unknown provider');
  }
}

async function callAIProvider(provider, key, message) {
  switch (provider) {
    case 'claude':
      return await callClaude(key, message);
    case 'gemini':
      return await callGemini(key, message);
    default:
      throw new Error('Unknown provider');
  }
}

// Claude (Anthropic) API
async function testClaude(apiKey) {
  const response = await proxyFetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true'
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

async function streamClaude(apiKey, onChunk) {
  const messages = conversationHistory
    .filter(msg => msg.role !== 'system')
    .map(msg => ({
      role: msg.role,
      content: msg.content
    }));

  const response = await proxyFetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true'
    },
    body: JSON.stringify({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 4096,
      messages: messages,
      stream: true
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to get response from Claude');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value);
    const lines = chunk.split('\n');

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = line.slice(6);
        if (data === '[DONE]') continue;

        try {
          const parsed = JSON.parse(data);
          if (parsed.type === 'content_block_delta' && parsed.delta?.text) {
            onChunk(parsed.delta.text);
          }
        } catch (e) {
          // Skip invalid JSON
        }
      }
    }
  }
}

async function callClaude(apiKey) {
  const messages = conversationHistory
    .filter(msg => msg.role !== 'system')
    .map(msg => ({
      role: msg.role,
      content: msg.content
    }));

  const response = await proxyFetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true'
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

async function streamGemini(apiKey, onChunk) {
  const result = await chrome.storage.local.get(['geminiModel']);
  const model = result.geminiModel || 'gemini-2.5-flash';

  const contents = conversationHistory.map(msg => ({
    role: msg.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: msg.content }]
  }));

  const response = await proxyFetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${apiKey}`, {
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

  const reader = response.body.getReader();
  const decoder = new TextDecoder();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value);
    const lines = chunk.split('\n');

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = line.slice(6);
        try {
          const parsed = JSON.parse(data);
          if (parsed.candidates && parsed.candidates[0]?.content?.parts) {
            const text = parsed.candidates[0].content.parts[0]?.text;
            if (text) {
              onChunk(text);
            }
          }
        } catch (e) {
          // Skip invalid JSON
        }
      }
    }
  }
}

async function callGemini(apiKey) {
  const result = await chrome.storage.local.get(['geminiModel']);
  const model = result.geminiModel || 'gemini-2.5-flash';

  const contents = conversationHistory.map(msg => ({
    role: msg.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: msg.content }]
  }));

  const response = await proxyFetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
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
