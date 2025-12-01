AI Osmosis - Chrome Extension

AI Osmosis is a Chrome/Brave extension that helps you learn a new language by passively translating a percentage of the content you read on the web.

Unlike standard translators that translate entire pages, this extension translates only 10% (configurable)of the text, allowing you to learn vocabulary and phrases in context while still understanding the main content.

✨ Features

Multi-Provider Support:Works withLocal Ollama, OpenAI, Google Gemini, and Anthropic Claude.

Contextual Immersion: Translates random words or sentences based on your chosen percentage.

Two Modes:

Sentences:Translates full phrases and displays the translation below the original text.

Words: Translates single words inline (e.g., "The gato sat on the mat").

Text-to-Speech (TTS):Click any translation to hear the pronunciation.

Includes aCloud Fallbackfor Linux/NixOS users missing system speech drivers.

Smart Caching: Prevents re-translating the same words to save API costs and improve performance.

Blacklist: Easily ignore specific sites (like code documentation or banking).

🚀 Installation

1. Load Unpacked (Developer Mode)

Download or clone this repository.

Open Chrome or Brave and navigate tochrome://extensions.

Enable Developer Mode (toggle in the top right).

Click Load unpacked.

Select the folder containing manifest.json.

2. Build for Production (.zip)

To create a clean .zip file for sharing or uploading to the Web Store:

npm install
npm run build


This creates adist/folder and anextension.zip file.

⚙️ Configuration

🦙 Option A: Local Ollama (Free & Private)

This is the default mode. It runs an AI model locally on your computer.

Install Ollama:Download fromollama.com.

Pull a Model:Open your terminal and run:

ollama pull llama3


Enable Browser Access (CORS): By default, browsers cannot talk to local servers. You must set the OLLAMA_ORIGINS environment variable.

Mac/Linux:

OLLAMA_ORIGINS="*" ollama serve


Windows (PowerShell):

$env:OLLAMA_ORIGINS="*"; ollama serve


In the Extension:

Go to Settings (⚙️) -> Provider: Ollama.

Endpoint: http://localhost:11434.

Model: llama3(or whatever you pulled).

☁️ Option B: Cloud APIs (OpenAI, Gemini, Claude)

If you prefer higher quality translations or don't have a powerful GPU.

OpenAI:

Get Key: platform.openai.com

Model: gpt-4o-mini (Recommended for speed/cost).

Google Gemini:

Get Key: aistudio.google.com

Model: gemini-1.5-flash.

Anthropic Claude:

Get Key: console.anthropic.com

Note: Requires "Direct Browser Access" to be enabled via headers (handled automatically by this extension).

🎧 Troubleshooting Audio (TTS)

"I click the text but hear nothing."

Check Volume: Ensure your system volume is up.

Linux / NixOS Users:

Brave/Chrome on Linux relies on the OS having a speech dispatcher installed.

If you are on NixOS, add services.speechd.enable = true; to your configuration.

Fallback: If the extension detects 0 system voices, it automatically attempts to download an MP3 from Google's TTS servers instead. Check the console (F12) for "Playing Cloud Audio".

"I see a 429 Error."

This meansRate Limit Exceeded.

If using OpenAI/Claude, check your credit balance.

The extension has a built-in "backoff" (it waits 2s, then 4s, then 8s), but if you are out of credits, it will stop.

🛠️ Development

Running Tests

This project uses Cypress to test the extension logic in a real browser environment with a mock AI server.

Install Dependencies:

npm install


Start Mock Server:

node mock-ollama.js


Run Cypress:

npx cypress open


Select "E2E Testing" -> "Chrome".

Click extension_spec.cy.js.

Project Structure

manifest.json: Chrome configuration and permissions.

background.js: Handles API calls, Audio proxying, and Cross-origin fetches.

content.js: The logic that runs on the web page (scanning text, swapping HTML).

popup.html/js: The user interface settings menu.