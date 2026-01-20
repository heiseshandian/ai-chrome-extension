// Content script for handling text selection and context menu

let selectedText = '';

// Listen for text selection
document.addEventListener('mouseup', (event) => {
  const selection = window.getSelection();
  const text = selection.toString().trim();

  if (text.length > 0) {
    selectedText = text;
    // Send message to background script to update context menu
    chrome.runtime.sendMessage({
      type: 'TEXT_SELECTED',
      text: text
    });
  }
});

// Listen for double-click selection
document.addEventListener('dblclick', (event) => {
  const selection = window.getSelection();
  const text = selection.toString().trim();

  if (text.length > 0) {
    selectedText = text;
    chrome.runtime.sendMessage({
      type: 'TEXT_SELECTED',
      text: text
    });
  }
});

// Listen for messages from background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'GET_SELECTED_TEXT') {
    sendResponse({ text: selectedText });
  }
  return true;
});
