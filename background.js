// Background service worker

let currentSelectedText = '';

// Create context menu on installation
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'sendToAI',
    title: 'Send to AI Assistant',
    contexts: ['selection']
  });

  // Set side panel to open on the right by default
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
});

// Handle context menu click
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'sendToAI') {
    const selectedText = info.selectionText;

    // Open side panel
    chrome.sidePanel.open({ windowId: tab.windowId });

    // Send selected text to side panel
    chrome.runtime.sendMessage({
      type: 'SEND_TO_AI',
      text: selectedText
    });
  }
});

// Handle toolbar icon click to open side panel
chrome.action.onClicked.addListener((tab) => {
  chrome.sidePanel.open({ windowId: tab.windowId });
});

// Listen for messages from content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'TEXT_SELECTED') {
    currentSelectedText = message.text;
  }
  return true;
});
