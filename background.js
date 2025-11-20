// ... (TTS logic remains exactly the same as previous) ...

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "speak") {
        speakText(request.text, request.lang, sender);
    }
});

async function speakText(text, targetLangCode, sender) {
    // ... (Keep existing TTS logic from previous step) ...
    console.log(`Background: TTS Requested for '${targetLangCode}' -> "${text}"`);
    try {
        chrome.tts.stop();
        const voices = await chrome.tts.getVoices();
        if (voices.length === 0) {
            if (sender && sender.tab) await playCloudAudioViaFetch(text, targetLangCode, sender.tab.id);
            return;
        }
        let bestVoice = voices.find(v => v.lang === targetLangCode);
        if (!bestVoice) {
            const prefix = targetLangCode.split('-')[0];
            bestVoice = voices.find(v => v.lang && v.lang.startsWith(prefix));
        }
        const options = { rate: 0.9, lang: targetLangCode };
        if (bestVoice) options.voiceName = bestVoice.voiceName;
        chrome.tts.speak(text, options, () => { if (chrome.runtime.lastError) console.error(chrome.runtime.lastError.message); });
    } catch (e) { console.error(e); }
}

async function playCloudAudioViaFetch(text, lang, tabId) {
    try {
        const safeText = text.length > 200 ? text.substring(0, 200) : text;
        const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(safeText)}&tl=${lang}&client=tw-ob`;
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Google TTS fetch failed: ${response.status}`);
        const blob = await response.blob();
        const reader = new FileReader();
        reader.onloadend = function() { chrome.tabs.sendMessage(tabId, { action: "playAudioData", data: reader.result }); };
        reader.readAsDataURL(blob);
    } catch (err) { console.error(err); }
}

// --- UPDATED TRANSLATION LOGIC ---
chrome.runtime.onConnect.addListener((port) => {
    if (port.name !== "ollama_stream") return;
    let isConnected = true;
    port.onDisconnect.addListener(() => isConnected = false);
    port.onMessage.addListener(async (request) => {
        if (request.action === "translateBatch") await handleStreamedTranslation(port, request, () => isConnected);
    });
});

async function handleStreamedTranslation(port, request, checkConnection) {
    const { texts, model, language, scope } = request; // Scope is new

    const safeSend = (msg) => {
        if (!checkConnection()) return false;
        try { port.postMessage(msg); return true; } catch (e) { return false; }
    };

    try {
        try {
            const statusCheck = await fetch('http://localhost:11434/api/tags');
            if (!statusCheck.ok) throw new Error("Ollama connection check failed");
        } catch (e) {
            safeSend({ type: "error", message: "Could not reach Ollama." });
            return;
        }

        for (const item of texts) {
            if (!checkConnection()) break;

            // CUSTOM PROMPT BASED ON SCOPE
            let prompt;
            if (scope === 'word') {
                prompt = `Translate this single word to ${language}. Output ONLY the translated word. No extra text or punctuation. Word: "${item.original}"`;
            } else {
                prompt = `Translate this text to ${language}. Output ONLY the translation. Text: "${item.original}"`;
            }

            try {
                const response = await fetch('http://localhost:11434/api/generate', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ model: model, prompt: prompt, stream: false })
                });

                if (!response.ok) continue;

                const data = await response.json();

                // Basic cleanup for words (remove periods if Ollama adds them)
                let cleanTranslation = data.response.trim();
                if (scope === 'word' && cleanTranslation.endsWith('.')) {
                    cleanTranslation = cleanTranslation.slice(0, -1);
                }

                const sent = safeSend({
                    type: "update",
                    data: { id: item.id, original: item.original, translated: cleanTranslation }
                });

                if (!sent) break;
            } catch (err) { console.error(err); }
        }
        safeSend({ type: "complete" });
    } catch (error) { safeSend({ type: "error", message: error.message }); }
}