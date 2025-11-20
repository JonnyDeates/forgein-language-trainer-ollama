// 1. SPEECH HANDLER
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "speak") {
        speakText(request.text, request.lang, sender);
    }
});

async function speakText(text, targetLangCode, sender) {
    try {
        chrome.tts.stop();
        const voices = await chrome.tts.getVoices();

        // Cloud Fallback (NixOS/Linux)
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

        chrome.tts.speak(text, options, () => {
            if (chrome.runtime.lastError) console.error(chrome.runtime.lastError.message);
        });
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

// 2. MULTI-PROVIDER TRANSLATION ENGINE
chrome.runtime.onConnect.addListener((port) => {
    if (port.name !== "ollama_stream") return;
    let isConnected = true;
    port.onDisconnect.addListener(() => isConnected = false);
    port.onMessage.addListener(async (request) => {
        if (request.action === "translateBatch") await handleBatch(port, request, () => isConnected);
    });
});

async function handleBatch(port, request, checkConnection) {
    const { texts, model, language, scope, provider, endpoint, apiKey, customPrompt } = request;

    const safeSend = (msg) => {
        if (!checkConnection()) return false;
        try { port.postMessage(msg); return true; } catch (e) { return false; }
    };

    const activeProvider = provider || 'ollama';
    const activeEndpoint = endpoint || 'http://localhost:11434';
    const activeModel = model || 'llama3';

    try {
        for (const item of texts) {
            if (!checkConnection()) break;

            // BUILD SYSTEM PROMPT
            let systemInstruction = "";
            if (scope === 'word') {
                systemInstruction = `Translate the word provided by the user into ${language}. Output ONLY the translated word. No punctuation, no explanations.`;
            } else {
                systemInstruction = `Translate the text provided by the user into ${language}. Output ONLY the translation.`;
            }

            if (customPrompt) systemInstruction += ` Style: ${customPrompt}`;

            // EXECUTE API CALL
            let translatedText = null;
            try {
                if (activeProvider === 'ollama') {
                    translatedText = await callOllama(item.original, systemInstruction, activeEndpoint, activeModel);
                } else if (activeProvider === 'openai') {
                    translatedText = await callOpenAI(item.original, systemInstruction, activeEndpoint, apiKey, activeModel);
                } else if (activeProvider === 'gemini') {
                    translatedText = await callGemini(item.original, systemInstruction, activeEndpoint, apiKey, activeModel);
                } else if (activeProvider === 'claude') {
                    translatedText = await callClaude(item.original, systemInstruction, activeEndpoint, apiKey, activeModel);
                }

                if (translatedText) {
                    if (scope === 'word') translatedText = translatedText.replace(/[."]/g, '').trim();

                    const sent = safeSend({
                        type: "update",
                        data: { id: item.id, original: item.original, translated: translatedText.trim() }
                    });
                    if (!sent) break;
                }
            } catch (err) {
                console.error(`Provider [${activeProvider}] Error:`, err);
            }
        }
        safeSend({ type: "complete" });
    } catch (error) { safeSend({ type: "error", message: error.message }); }
}

// --- API ADAPTERS ---
async function callOllama(text, system, endpoint, model) {
    // Remove trailing slash if user added it
    const cleanEndpoint = endpoint.replace(/\/$/, '');
    const prompt = `${system}\nText: ${text}`;
    const res = await fetch(`${cleanEndpoint}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: model, prompt: prompt, stream: false })
    });
    if (!res.ok) throw new Error(res.statusText);
    const data = await res.json();
    return data.response;
}

async function callOpenAI(text, system, endpoint, key, model) {
    const cleanEndpoint = endpoint.replace(/\/$/, '');
    const res = await fetch(`${cleanEndpoint}/chat/completions`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${key}`
        },
        body: JSON.stringify({
            model: model,
            messages: [
                { role: "system", content: system },
                { role: "user", content: text }
            ]
        })
    });
    if (!res.ok) throw new Error(`OpenAI Error: ${res.status}`);
    const data = await res.json();
    return data.choices[0].message.content;
}

async function callGemini(text, system, endpoint, key, model) {
    // Gemini endpoint usually: https://generativelanguage.googleapis.com/v1beta
    const cleanEndpoint = endpoint.replace(/\/$/, '');
    const url = `${cleanEndpoint}/models/${model}:generateContent?key=${key}`;
    const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            contents: [{
                parts: [{ text: `${system}\n\nUser Text: ${text}` }]
            }]
        })
    });
    if (!res.ok) throw new Error(`Gemini Error: ${res.status}`);
    const data = await res.json();
    return data.candidates[0].content.parts[0].text;
}

async function callClaude(text, system, endpoint, key, model) {
    const cleanEndpoint = endpoint.replace(/\/$/, '');
    const res = await fetch(`${cleanEndpoint}/messages`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-api-key': key,
            'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
            model: model,
            max_tokens: 100,
            system: system,
            messages: [{ role: "user", content: text }]
        })
    });
    if (!res.ok) throw new Error(`Claude Error: ${res.status}`);
    const data = await res.json();
    return data.content[0].text;
}