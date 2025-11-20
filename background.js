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

            let systemInstruction = "";
            if (scope === 'word') {
                systemInstruction = `Translate the word provided by the user into ${language}. Output ONLY the translated word. No punctuation, no explanations.`;
            } else {
                systemInstruction = `Translate the text provided by the user into ${language}. Output ONLY the translation.`;
            }

            if (customPrompt) systemInstruction += ` Style: ${customPrompt}`;

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

                // Add a small delay between requests to be polite to APIs (helps prevent 429)
                if (activeProvider !== 'ollama') {
                    await new Promise(r => setTimeout(r, 500));
                }

            } catch (err) {
                console.error(`Provider [${activeProvider}] Error:`, err);
                // Send error to UI so user knows why it stopped
                if (err.message.includes("429") || err.message.includes("Quota")) {
                    safeSend({ type: "error", message: `API Limit: ${err.message}` });
                    break; // Stop batch on rate limit
                }
            }
        }
        safeSend({ type: "complete" });
    } catch (error) { safeSend({ type: "error", message: error.message }); }
}

// --- ROBUST FETCH WITH RETRY ---
// Retries on 429 (Rate Limit) and 5xx (Server Errors)
async function fetchWithRetry(url, options, retries = 3, backoff = 1000) {
    try {
        const res = await fetch(url, options);

        if (res.ok) return res;

        // If Rate Limit (429) or Server Error (503, 500), Retry
        if ((res.status === 429 || res.status >= 500) && retries > 0) {
            console.warn(`Request failed with ${res.status}. Retrying in ${backoff}ms...`);
            await new Promise(r => setTimeout(r, backoff));
            return fetchWithRetry(url, options, retries - 1, backoff * 2); // Exponential backoff
        }

        // If generic error, try to parse detailed message
        const errorText = await res.text();
        throw new Error(`Status ${res.status}: ${errorText}`);

    } catch (err) {
        if (retries > 0 && !err.message.includes("Status")) {
            // Retry on network errors (e.g. wifi blip)
            console.warn(`Network error. Retrying...`);
            await new Promise(r => setTimeout(r, backoff));
            return fetchWithRetry(url, options, retries - 1, backoff * 2);
        }
        throw err;
    }
}

// --- API ADAPTERS ---

async function callOllama(text, system, endpoint, model) {
    const cleanEndpoint = endpoint.replace(/\/$/, '');
    const prompt = `${system}\nText: ${text}`;
    const res = await fetchWithRetry(`${cleanEndpoint}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: model, prompt: prompt, stream: false })
    }, 1, 1000); // Fewer retries for local

    const data = await res.json();
    return data.response;
}

async function callOpenAI(text, system, endpoint, key, model) {
    const cleanEndpoint = endpoint.replace(/\/$/, '');
    const res = await fetchWithRetry(`${cleanEndpoint}/chat/completions`, {
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

    const data = await res.json();
    if (data.error) throw new Error(data.error.message); // Handle internal API errors
    return data.choices[0].message.content;
}

async function callGemini(text, system, endpoint, key, model) {
    const cleanEndpoint = endpoint.replace(/\/$/, '');
    // Use header-based auth approach
    const url = `${cleanEndpoint}/models/${model}:generateContent`;

    const res = await fetchWithRetry(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-goog-api-key': key
        },
        body: JSON.stringify({
            contents: [{
                parts: [{ text: `${system}\n\nUser Text: ${text}` }]
            }]
        })
    });

    const data = await res.json();
    if (data.error) throw new Error(data.error.message);

    if (data.candidates && data.candidates[0] && data.candidates[0].content) {
        return data.candidates[0].content.parts[0].text;
    } else {
        throw new Error("Gemini blocked content (safety filter)");
    }
}

async function callClaude(text, system, endpoint, key, model) {
    const cleanEndpoint = endpoint.replace(/\/$/, '');
    const res = await fetchWithRetry(`${cleanEndpoint}/messages`, {
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

    const data = await res.json();
    if (data.error) throw new Error(data.error.message);
    return data.content[0].text;
}