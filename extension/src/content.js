let globalSettings = {};
let observer;
let scanTimeout;
let processedNodes = new WeakSet();
let recentTranslations = new Set();
let translationCache = new Map();
let currentAudio = null;
let isExtensionActive = false;

function uuidv4() {
    return "10000000-1000-4000-8000-100000000000".replace(/[018]/g, c =>
        (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
    );
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "updateDisplayMode") {
        updateAllTranslations(request.mode);
    }
    else if (request.action === "playAudioData") {
        playAudioData(request.data);
    }
    else if (request.action === "updateState") {
        if (request.active) {
            if (!isExtensionActive) {
                // Enabling from disabled state
                console.log("Ollama Extension: Enabling...");
                if (request.settings) globalSettings = { ...globalSettings, ...request.settings };
                init();
            } else {
                // Already active - Check for Structural Changes
                const newSettings = request.settings;
                const oldScope = globalSettings.scope;
                const oldLang = globalSettings.language;
                const oldPerc = globalSettings.percentage;

                // Update local reference
                if (newSettings) globalSettings = { ...globalSettings, ...newSettings };

                // Detect if we need a Hard Reset (Re-scan) or just a Soft Update (Style)
                const needsReset = (newSettings.scope !== oldScope) ||
                    (newSettings.language !== oldLang) ||
                    (newSettings.percentage !== oldPerc);

                if (needsReset) {
                    console.log("Ollama Extension: Settings changed, re-scanning...");
                    cleanup(); // Wipe old
                    init();    // Start new
                } else if (globalSettings.displayMode) {
                    // Just style update
                    updateAllTranslations(globalSettings.displayMode);
                }
            }
        } else {
            // Disabling
            console.log("Ollama Extension: Disabling...");
            cleanup();
        }
    }
});

async function init() {
    if (!globalSettings.language) {
        globalSettings = await chrome.storage.local.get([
            'enabled', 'scope', 'allowDuplicates', 'displayMode', 'percentage',
            'model', 'language',
            'provider', 'endpoint', 'apiKey', 'customPrompt', 'blacklist'
        ]);
    }

    if (globalSettings.enabled === false) { cleanup(); return; }

    const currentHost = window.location.hostname.toLowerCase();
    const blacklist = (globalSettings.blacklist || []).map(d => d.toLowerCase().trim());
    const isIgnored = blacklist.some(domain => currentHost === domain || currentHost.endsWith('.' + domain));

    if (isIgnored) {
        console.log("Ollama Extension: Site ignored.");
        cleanup();
        return;
    }

    globalSettings.provider = globalSettings.provider || 'ollama';
    globalSettings.endpoint = globalSettings.endpoint || 'http://localhost:11434';
    globalSettings.model = globalSettings.model || 'llama3';
    globalSettings.language = globalSettings.language || 'Spanish';
    globalSettings.percentage = globalSettings.percentage || 10;
    globalSettings.displayMode = globalSettings.displayMode || 'below';
    globalSettings.scope = globalSettings.scope || 'sentences';
    globalSettings.allowDuplicates = globalSettings.allowDuplicates === true;

    isExtensionActive = true;
    console.log(`AI Osmosis: Starting. Scope: ${globalSettings.scope}`);
    requestScan(document.body);
    startObserver();
}

function cleanup() {
    isExtensionActive = false;
    if (observer) { observer.disconnect(); observer = null; }
    if (scanTimeout) clearTimeout(scanTimeout);
    if (currentAudio) { currentAudio.pause(); currentAudio = null; }

    const selector = '.ollama-translated, .ollama-pending, .ollama-word-wrapper, .ollama-interlinear-container, .ollama-translated-highlight';
    const elements = document.querySelectorAll(selector);

    elements.forEach(el => {
        if (el.dataset.original) {
            const textNode = document.createTextNode(el.dataset.original);
            el.parentNode.replaceChild(textNode, el);
        } else {
            // Heuristic fallback
            const rawText = el.innerText.split('(')[0].trim();
            if (rawText) {
                const textNode = document.createTextNode(rawText);
                el.parentNode.replaceChild(textNode, el);
            }
        }
    });
    processedNodes = new WeakSet();
    recentTranslations.clear();
}

function startObserver() {
    if (observer) return;
    observer = new MutationObserver((mutations) => {
        if (!isExtensionActive) return;
        let shouldScan = false;
        mutations.forEach(mutation => {
            mutation.addedNodes.forEach(node => {
                if (node.nodeType === 1) {
                    if (node.matches('.ollama-pending, .ollama-translated, .ollama-interlinear-container, .ollama-word-wrapper')) return;
                    if (node.closest && node.closest('.ollama-translated')) return;
                    shouldScan = true;
                }
                if (node.nodeType === 3) shouldScan = true;
            });
        });
        if (shouldScan) requestScan(document.body);
    });
    observer.observe(document.body, { childList: true, subtree: true });
}

function requestScan(rootNode) {
    if (scanTimeout) clearTimeout(scanTimeout);
    scanTimeout = setTimeout(() => {
        if (isExtensionActive) executeScan(rootNode);
    }, 1000);
}

function executeScan(rootNode) {
    if (!isExtensionActive) return;
    const walker = document.createTreeWalker(rootNode, NodeFilter.SHOW_TEXT, {
        acceptNode: (node) => {
            if (!node.parentElement) return NodeFilter.FILTER_REJECT;
            if (node.parentElement.closest('.ollama-pending, .ollama-translated, .ollama-interlinear-container, .ollama-word-wrapper')) return NodeFilter.FILTER_REJECT;
            const tag = node.parentElement.tagName.toLowerCase();
            if (['script', 'style', 'noscript', 'code', 'pre', 'textarea', 'input', 'select', 'button', 'meta'].includes(tag)) return NodeFilter.FILTER_REJECT;
            if (processedNodes.has(node.parentElement)) return NodeFilter.FILTER_REJECT;
            const text = node.nodeValue.trim();
            if (text.length < 2) return NodeFilter.FILTER_REJECT;
            if (!/[a-zA-Z]/.test(text)) return NodeFilter.FILTER_REJECT;
            return NodeFilter.FILTER_ACCEPT;
        }
    });

    let textNodes = [];
    while (walker.nextNode()) textNodes.push(walker.currentNode);
    if (textNodes.length === 0) return;
    textNodes.forEach(node => { if (node.parentElement) processedNodes.add(node.parentElement); });

    if (globalSettings.scope === 'words') processWords(textNodes);
    else processSentences(textNodes);
}

function processSentences(nodes) {
    if (!isExtensionActive) return;
    const threshold = globalSettings.percentage / 100;
    const candidates = nodes.filter(node => node.nodeValue.trim().length > 8);
    const selectedNodes = candidates.filter(() => Math.random() < threshold);
    if (selectedNodes.length > 0) sendBatch(selectedNodes, 'sentence');
}

function processWords(nodes) {
    if (!isExtensionActive) return;
    const threshold = globalSettings.percentage / 100;
    const batch = [];
    nodes.forEach(node => {
        const text = node.nodeValue;
        const parts = text.split(/([a-zA-Z\u00C0-\u00FF]{2,})/);
        let hasTranslation = false;
        const fragment = document.createDocumentFragment();

        parts.forEach(part => {
            if (/[a-zA-Z\u00C0-\u00FF]{2,}/.test(part) && Math.random() < threshold) {
                if (globalSettings.allowDuplicates && translationCache.has(part)) {
                    const cachedTrans = translationCache.get(part);
                    const id = uuidv4();
                    const span = document.createElement('span');
                    span.dataset.ollamaId = id;
                    span.dataset.original = part;
                    span.dataset.translated = cachedTrans;
                    span.textContent = part;
                    span.className = 'ollama-pending';
                    span.dataset.scope = 'word';
                    fragment.appendChild(span);
                    hasTranslation = true;
                    setTimeout(() => { if (isExtensionActive) renderNode(span, globalSettings.displayMode); }, 0);
                }
                else if (!recentTranslations.has(part)) {
                    recentTranslations.add(part);
                    setTimeout(() => recentTranslations.delete(part), 10000);
                    const id = uuidv4();
                    const span = document.createElement('span');
                    span.dataset.ollamaId = id;
                    span.dataset.original = part;
                    span.dataset.translated = "";
                    span.textContent = part;
                    span.className = 'ollama-pending';
                    span.dataset.scope = 'word';
                    fragment.appendChild(span);
                    batch.push({ id: id, original: part });
                    hasTranslation = true;
                } else { fragment.appendChild(document.createTextNode(part)); }
            } else { fragment.appendChild(document.createTextNode(part)); }
        });
        if (hasTranslation && node.parentNode) node.parentNode.replaceChild(fragment, node);
    });
    if (batch.length > 0) sendBatchToBackground(batch, 'word');
}

function sendBatch(nodes, scope) {
    if (!isExtensionActive) return;
    const batch = [];
    nodes.forEach(node => {
        if (!node.parentNode) return;
        const originalText = node.nodeValue.trim();
        if (recentTranslations.has(originalText)) return;
        recentTranslations.add(originalText);
        setTimeout(() => recentTranslations.delete(originalText), 10000);
        const id = uuidv4();
        const span = document.createElement('span');
        span.dataset.ollamaId = id;
        span.dataset.original = originalText;
        span.dataset.translated = "";
        span.textContent = originalText;
        span.className = 'ollama-pending';
        span.dataset.scope = scope;
        node.parentNode.replaceChild(span, node);
        batch.push({ id, original: originalText });
    });
    if (batch.length > 0) sendBatchToBackground(batch, scope);
}

function sendBatchToBackground(batch, scope) {
    if (!isExtensionActive) return;
    const port = chrome.runtime.connect({ name: "ollama_stream" });
    port.onMessage.addListener((msg) => {
        if (!isExtensionActive) return;
        if (msg.type === "update") {
            if (msg.data && msg.data.original && msg.data.translated) {
                translationCache.set(msg.data.original, msg.data.translated);
            }
            applySingleTranslation(msg.data);
        } else if (msg.type === "error") {
            console.error("Stream Error:", msg.message);
            document.querySelectorAll('.ollama-pending').forEach(el => el.classList.remove('ollama-pending'));
        }
    });
    port.postMessage({
        action: "translateBatch",
        texts: batch,
        model: globalSettings.model,
        language: globalSettings.language,
        scope: scope,
        provider: globalSettings.provider,
        endpoint: globalSettings.endpoint,
        apiKey: globalSettings.apiKey,
        customPrompt: globalSettings.customPrompt
    });
}

function applySingleTranslation(item) {
    if (!isExtensionActive) return;
    if (!item || item.error) return;
    const span = document.querySelector(`span[data-ollama-id="${item.id}"]`);
    if (span) {
        span.classList.remove('ollama-pending');
        span.dataset.translated = item.translated;
        renderNode(span, globalSettings.displayMode);
    }
}

function speakText(text) {
    if (!text) return;
    if (currentAudio) { currentAudio.pause(); currentAudio.currentTime = 0; currentAudio = null; }
    const userLang = globalSettings.language.trim().toLowerCase();
    const langMap = { 'spanish': 'es-ES', 'french': 'fr-FR', 'german': 'de-DE', 'italian': 'it-IT', 'japanese': 'ja-JP', 'chinese (mandarin)': 'zh-CN', 'chinese': 'zh-CN', 'korean': 'ko-KR', 'russian': 'ru-RU', 'portuguese': 'pt-BR', 'hindi': 'hi-IN', 'dutch': 'nl-NL', 'polish': 'pl-PL', 'english': 'en-US' };
    const searchCode = langMap[userLang] || 'en-US';
    console.log(`Ollama Content: Requesting TTS for (${searchCode})`);
    chrome.runtime.sendMessage({ action: "speak", text: text, lang: searchCode });
}

function playAudioData(base64string) {
    if (currentAudio) { currentAudio.pause(); currentAudio.currentTime = 0; }
    const audio = new Audio(base64string);
    currentAudio = audio;
    audio.play().catch(e => console.error("Audio Data Playback Error:", e));
    audio.onended = () => { if (currentAudio === audio) currentAudio = null; };
}

function renderNode(span, mode) {
    if (!isExtensionActive) return;
    const original = span.dataset.original;
    const translated = span.dataset.translated;
    const scope = span.dataset.scope || 'sentence';

    if (!translated) return;

    const newSpan = span.cloneNode(true);
    span.parentNode.replaceChild(newSpan, span);
    span = newSpan;
    span.classList.add('ollama-translated');
    span.classList.remove('ollama-pending');

    const attachListener = (element) => {
        element.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            speakText(translated);
        });
    };

    if (mode === 'replace') {
        span.textContent = translated;
        span.classList.add('ollama-translated-highlight');
        span.classList.remove('ollama-interlinear-container');
        span.classList.remove('ollama-word-wrapper');
        span.title = "Original: " + original + " (Click to Listen)";
        attachListener(span);

    } else {
        if (scope === 'word') {
            span.innerHTML = `${original} <span class="ollama-sub-text-inline" title="Click to Listen">(${translated})</span>`;
            span.classList.add('ollama-word-wrapper');
            span.classList.remove('ollama-interlinear-container');
            span.classList.remove('ollama-translated-highlight');
            const subText = span.querySelector('.ollama-sub-text-inline');
            if(subText) attachListener(subText);
        } else {
            span.innerHTML = `${original}<br><span class="ollama-sub-text" title="Click to Listen">${translated} 🔊</span>`;
            span.classList.add('ollama-interlinear-container');
            span.classList.remove('ollama-translated-highlight');
            span.classList.remove('ollama-word-wrapper');
            span.removeAttribute('title');
            attachListener(span);
        }
    }
}

function updateAllTranslations(newMode) {
    if (!isExtensionActive) return;
    globalSettings.displayMode = newMode;
    const elements = document.querySelectorAll('span[data-ollama-id]');
    elements.forEach(span => {
        if (span.dataset.translated) {
            renderNode(span, newMode);
        }
    });
}

init();