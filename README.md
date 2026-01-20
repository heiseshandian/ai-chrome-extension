# AI Assistant Chrome Extension

A Chrome extension with Manifest V3 that provides a sidebar to interact with Claude and Gemini. Select text on any webpage and send it to your chosen AI provider via context menu.

## Features

- **Right-Side Panel**: 500px wide sidebar on the right side of your browser
- **Multiple AI Providers**: Support for Claude (Anthropic) and Gemini (Google)
- **Context Menu Integration**: Double-click or select text, then right-click to send to AI
- **Streaming Responses**: Real-time streaming output as the AI generates responses
- **Conversation History**: Maintains chat history across sessions
- **Proxy Support**: Optional proxy configuration (e.g., http://localhost:7890)
- **API Key Management**: Securely store your API keys in Chrome's local storage

## Installation

1. **Add Icons**: The extension needs icon files. Create simple PNG icons (16x16, 48x48, 128x128) and place them in the `icons/` folder:
   - `icons/icon16.png`
   - `icons/icon48.png`
   - `icons/icon128.png`

   You can create simple colored squares or download icons from icon libraries.

2. **Load Extension in Chrome**:
   - Open Chrome and navigate to `chrome://extensions/`
   - Enable "Developer mode" (toggle in top-right corner)
   - Click "Load unpacked"
   - Select the `ai-chrome-extension` folder

3. **Configure API Keys**:
   - Click the extension icon in Chrome toolbar to open the side panel (opens on the right)
   - Select your preferred AI provider
   - Enter your API key:
     - **Claude**: Get from [Anthropic Console](https://console.anthropic.com/)
     - **Gemini**: Get from [Google AI Studio](https://makersuite.google.com/app/apikey)
   - (Optional) Enter proxy URL if needed (e.g., `http://localhost:7890`)
   - Click "Save Configuration"
   - Click "Test Connection" to verify

## Usage

### Method 1: Direct Chat
1. Click the extension icon to open the side panel
2. Type your message in the input box
3. Click "Send" or press Enter

### Method 2: Context Menu
1. On any webpage, select text (you can double-click a word or drag to select)
2. Right-click on the selected text
3. Choose "Send to AI Assistant" from the context menu
4. The side panel will open with your selected text ready to send

## File Structure

```
ai-chrome-extension/
├── manifest.json          # Extension configuration
├── background.js          # Service worker for context menu
├── content.js            # Content script for text selection
├── sidepanel.html        # Side panel UI
├── sidepanel.css         # Side panel styling
├── sidepanel.js          # Side panel logic and AI API calls
├── icons/                # Extension icons
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
└── README.md             # This file
```

## API Endpoints Used

- **Claude**: `https://api.anthropic.com/v1/messages`
- **Gemini**: `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent`

## Proxy Configuration

If you need to route API requests through a proxy (for example, to bypass network restrictions):

1. Set up a local proxy server (e.g., using V2Ray, Clash, or similar tools) on `http://localhost:7890`
2. Enter the proxy URL in the extension's configuration
3. Note: Due to browser CORS limitations, your proxy server must handle CORS headers properly

## Security Notes

- API keys are stored in Chrome's local storage (not synced)
- Keys are only accessible by this extension
- All API calls are made directly to the provider's servers (or through your configured proxy)
- Consider the security implications of storing API keys in the browser

## Troubleshooting

**Extension won't load:**
- Make sure all files are in the correct location
- Check that icon files exist in the `icons/` folder

**API connection fails:**
- Verify your API key is correct
- Check that you have credits/quota available with the provider
- If using a proxy, ensure it's running and the URL is correct
- Look at the browser console (F12) for error messages
- For Gemini: The extension auto-detects the best available model for your API key

**Context menu doesn't appear:**
- Make sure you've selected text on the page
- Try refreshing the webpage
- Check that the extension is enabled

## Development

To modify the extension:
1. Make changes to the files
2. Go to `chrome://extensions/`
3. Click the refresh icon on the extension card
4. Test your changes

## License

MIT
