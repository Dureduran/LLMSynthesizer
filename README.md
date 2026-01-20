# LLM Synthesizer

A modern web application that lets you query multiple AI models simultaneously and compare their responses side-by-side.

![LLM Synthesizer](https://img.shields.io/badge/AI-Multi--Model-purple)
![License](https://img.shields.io/badge/license-MIT-blue)

## Features

- 🤖 **Multi-Model Support** - Query ChatGPT, Gemini, Claude, and Grok simultaneously
- 📊 **Side-by-Side Comparison** - Compare responses from different AI models
- 💾 **Conversation History** - Save and revisit past conversations
- 📤 **Export Options** - Export conversations as JSON or Markdown
- 🌙 **Dark/Light Theme** - Toggle between themes for comfortable viewing
- 🔐 **Privacy-First** - API keys stored locally in your browser, never on servers
- ⌨️ **Keyboard Shortcuts** - Ctrl+Enter to send, Ctrl+N for new chat

## Quick Start

1. **Clone the repository**
   ```bash
   git clone https://github.com/Dureduran/LLMSynthesizer.git
   cd LLMSynthesizer
   ```

2. **Start a local server**
   ```bash
   python -m http.server 8888
   ```

3. **Open in browser**
   ```
   http://localhost:8888
   ```

4. **Configure API Keys**
   - Click ⚙️ Settings
   - Enter your API keys for the models you want to use
   - Keys are stored in your browser's localStorage (never sent to any server)

## Getting API Keys

| Provider | Get API Key |
|----------|-------------|
| OpenAI (ChatGPT) | [platform.openai.com](https://platform.openai.com/api-keys) |
| Google (Gemini) | [aistudio.google.com](https://aistudio.google.com/app/apikey) |
| Anthropic (Claude) | [console.anthropic.com](https://console.anthropic.com/) |
| xAI (Grok) | [console.x.ai](https://console.x.ai/) |

## Project Structure

```
LLMSynthesizer/
├── index.html          # Main HTML structure
├── styles.css          # Styling and themes
├── app.js              # UI logic and event handling
└── api/
    ├── synthesizer.js  # Core engine for managing multiple APIs
    ├── openai.js       # OpenAI/ChatGPT integration
    ├── gemini.js       # Google Gemini integration
    ├── claude.js       # Anthropic Claude integration
    └── grok.js         # xAI Grok integration
```

## Security

- ✅ API keys are stored **only** in your browser's localStorage
- ✅ No server-side code - everything runs client-side
- ✅ No tracking or analytics
- ✅ Safe to use with your own API keys

## License

MIT License - feel free to use and modify!

## Contributing

Contributions welcome! Feel free to open issues or submit pull requests.
