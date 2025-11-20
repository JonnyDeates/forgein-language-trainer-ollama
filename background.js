// 1. SMART TTS HANDLER
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "speak") {
        speakText(request.text, request.lang, sender);
    }
});

async function speakText(text, targetLangCode, sender) {
    console.log(`Background: TTS Requested for '${targetLangCode}' -> "${text}"`);

    try {
        chrome.tts.stop();

        // Check system voices
        const voices = await chrome.tts.getVoices();

        // --- FALLBACK: CLOUD AUDIO FETCH ---
        if (voices.length === 0) {
            console.warn("Background: No system voices found. Fetching Cloud Audio...");

            if (sender && sender.tab) {
                await playCloudAudioViaFetch(text, targetLangCode, sender.tab.id);
            }
            return;
        }
        // -----------------------------------

        let bestVoice = voices.find(v => v.lang === targetLangCode);
        if (!bestVoice) {
            const prefix = targetLangCode.split('-')[0];
            bestVoice = voices.find(v => v.lang && v.lang.startsWith(prefix));
        }

        const options = { rate: 0.9, lang: targetLangCode };

        if (bestVoice) {
            options.voiceName = bestVoice.voiceName;
        }

        chrome.tts.speak(text, options, () => {
            if (chrome.runtime.lastError) {
                console.error("Background: TTS Error:", chrome.runtime.lastError.message);
            }
        });

    } catch (e) {
        console.error("Background: Critical TTS failure", e);
    }
}

// --- NEW: PROXY FETCH FOR AUDIO ---
// Downloads the MP3 in the background (privileged) and sends data to content script
async function playCloudAudioViaFetch(text, lang, tabId) {
    try {
        // Truncate to avoid URL limits (approx 200 chars safe limit for this API)
        const safeText = text.length > 200 ? text.substring(0, 200) : text;

        const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(safeText)}&tl=${lang}&client=tw-ob`;

        const response = await fetch(url);
        if (!response.ok) throw new Error(`Google TTS fetch failed: ${response.status}`);

        const blob = await response.blob();
        const reader = new FileReader();

        reader.onloadend = function() {
            const base64data = reader.result;
            // Send the actual audio data to the tab
            chrome.tabs.sendMessage(tabId, {
                action: "playAudioData",
                data: base64data
            });
        };

        reader.readAsDataURL(blob);

    } catch (err) {
        console.error("Background: Cloud TTS Fetch Error", err);
    }
}

// 2. STREAMING TRANSLATIONS (Port Connection)
chrome.runtime.onConnect.addListener((port) => {
    if (port.name !== "ollama_stream") return;

    let isConnected = true;
    port.onDisconnect.addListener(() => {
        console.log("Background: Port disconnected by tab closure.");
        isConnected = false;
    });

    port.onMessage.addListener(async (request) => {
        if (request.action === "translateBatch") {
            await handleStreamedTranslation(port, request, () => isConnected);
        }
    });
});

async function handleStreamedTranslation(port, request, checkConnection) {
    const { texts, model, language } = request;

    const safeSend = (msg) => {
        if (!checkConnection()) return false;
        try {
            port.postMessage(msg);
            return true;
        } catch (e) {
            return false;
        }
    };

    try {
        try {
            const statusCheck = await fetch('http://localhost:11434/api/tags');
            if (!statusCheck.ok) throw new Error("Ollama connection check failed");
        } catch (e) {
            safeSend({ type: "error", message: "Could not reach Ollama. Is it running?" });
            return;
        }

        for (const item of texts) {
            if (!checkConnection()) break;

            const prompt = `Translate this text to ${language}. Output ONLY the translation. Text: "${item.original}"`;

            try {
                const response = await fetch('http://localhost:11434/api/generate', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ model: model, prompt: prompt, stream: false })
                });

                if (!response.ok) {
                    continue;
                }

                const data = await response.json();

                const sent = safeSend({
                    type: "update",
                    data: { id: item.id, original: item.original, translated: data.response.trim() }
                });

                if (!sent) break;

            } catch (err) {
                console.error("Translation fetch error:", err);
            }
        }

        safeSend({ type: "complete" });

    } catch (error) {
        safeSend({ type: "error", message: error.message });
    }
}