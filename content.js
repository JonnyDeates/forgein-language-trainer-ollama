let globalSettings = {};
let observer;
let scanTimeout;
let processedNodes = new WeakSet();
let recentTranslations = new Set();

function uuidv4() {
    return "10000000-1000-4000-8000-100000000000".replace(/[018]/g, c =>
        (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
    );
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "updateDisplayMode") {
        updateAllTranslations(request.mode);
    }
    // --- NEW: HANDLE RAW AUDIO DATA ---
    else if (request.action === "playAudioData") {
        playAudioData(request.data);
    }
});

async function init() {
    globalSettings = await chrome.storage.local.get(['enabled', 'displayMode', 'percentage', 'model', 'language']);

    if (globalSettings.enabled === false) return;

    globalSettings.model = globalSettings.model || 'llama3';
    globalSettings.language = globalSettings.language || 'Spanish';
    globalSettings.percentage = globalSettings.percentage || 10;
    globalSettings.displayMode = globalSettings.displayMode || 'below';

    console.log(`Ollama Extension: Active. (Target: ${globalSettings.percentage}%)`);

    requestScan(document.body);
    startObserver();
}

function startObserver() {
    observer = new MutationObserver((mutations) => {
        let shouldScan = false;
        mutations.forEach(mutation => {
            mutation.addedNodes.forEach(node => {
                if (node.nodeType === 1) {
                    if (node.matches('.ollama-pending, .ollama-translated, .ollama-interlinear-container')) return;
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
        executeScan(rootNode);
    }, 1000);
}

function executeScan(rootNode) {
    const walker = document.createTreeWalker(
        rootNode,
        NodeFilter.SHOW_TEXT,
        {
            acceptNode: (node) => {
                if (!node.parentElement) return NodeFilter.FILTER_REJECT;
                if (node.parentElement.closest('.ollama-pending, .ollama-translated, .ollama-interlinear-container')) return NodeFilter.FILTER_REJECT;

                const tag = node.parentElement.tagName.toLowerCase();
                if (['script', 'style', 'noscript', 'code', 'pre', 'textarea', 'input', 'select', 'button', 'meta'].includes(tag)) return NodeFilter.FILTER_REJECT;

                if (processedNodes.has(node.parentElement)) return NodeFilter.FILTER_REJECT;

                const text = node.nodeValue.trim();
                if (text.length < 8) return NodeFilter.FILTER_REJECT;
                if (!/[a-zA-Z]/.test(text)) return NodeFilter.FILTER_REJECT;

                if (recentTranslations.has(text)) return NodeFilter.FILTER_REJECT;

                return NodeFilter.FILTER_ACCEPT;
            }
        }
    );

    let candidates = [];
    while (walker.nextNode()) {
        candidates.push(walker.currentNode);
    }

    if (candidates.length === 0) return;

    const threshold = globalSettings.percentage / 100;
    const selectedNodes = candidates.filter(() => Math.random() < threshold);

    candidates.forEach(node => {
        if (node.parentElement) processedNodes.add(node.parentElement);
    });

    if (selectedNodes.length > 0) {
        sendBatch(selectedNodes);
    }
}

function sendBatch(nodes) {
    const batch = [];
    nodes.forEach(node => {
        if (!node.parentNode) return;
        const originalText = node.nodeValue.trim();

        recentTranslations.add(originalText);
        setTimeout(() => recentTranslations.delete(originalText), 10000);

        const id = uuidv4();
        const span = document.createElement('span');
        span.dataset.ollamaId = id;
        span.dataset.original = originalText;
        span.dataset.translated = "";
        span.textContent = originalText;
        span.className = 'ollama-pending';

        node.parentNode.replaceChild(span, node);
        batch.push({ id, original: originalText });
    });

    if (batch.length === 0) return;

    const port = chrome.runtime.connect({ name: "ollama_stream" });

    port.onMessage.addListener((msg) => {
        if (msg.type === "update") {
            applySingleTranslation(msg.data);
        } else if (msg.type === "error") {
            console.error("Ollama Stream Error:", msg.message);
            document.querySelectorAll('.ollama-pending').forEach(el => el.classList.remove('ollama-pending'));
        }
    });

    port.postMessage({
        action: "translateBatch",
        texts: batch,
        model: globalSettings.model,
        language: globalSettings.language
    });
}

function applySingleTranslation(item) {
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

    const userLang = globalSettings.language.trim().toLowerCase();
    const langMap = {
        'spanish': 'es-ES',
        'french': 'fr-FR',
        'german': 'de-DE',
        'italian': 'it-IT',
        'japanese': 'ja-JP',
        'chinese (mandarin)': 'zh-CN',
        'chinese': 'zh-CN',
        'korean': 'ko-KR',
        'russian': 'ru-RU',
        'portuguese': 'pt-BR',
        'hindi': 'hi-IN',
        'dutch': 'nl-NL',
        'polish': 'pl-PL',
        'english': 'en-US'
    };

    const searchCode = langMap[userLang] || 'en-US';

    console.log(`Ollama Content: Requesting TTS for (${searchCode})`);
    chrome.runtime.sendMessage({
        action: "speak",
        text: text,
        lang: searchCode
    });
}

// --- NEW: Plays raw Base64 Audio Data ---
function playAudioData(base64string) {
    console.log("Ollama Content: Playing Audio Data via Proxy");
    const audio = new Audio(base64string);
    audio.play().catch(e => console.error("Audio Data Playback Error:", e));
}

function renderNode(span, mode) {
    const original = span.dataset.original;
    const translated = span.dataset.translated;

    if (!translated) return;

    const newSpan = span.cloneNode(true);
    span.parentNode.replaceChild(newSpan, span);
    span = newSpan;

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
        span.title = "Original: " + original + " (Click to Listen)";

        attachListener(span);

    } else {
        span.innerHTML = `${original}<br><span class="ollama-sub-text" title="Click to Listen">${translated}</span>`;
        span.classList.add('ollama-interlinear-container');
        span.classList.remove('ollama-translated-highlight');
        span.removeAttribute('title');

        attachListener(span);
    }
}

function updateAllTranslations(newMode) {
    globalSettings.displayMode = newMode;
    const elements = document.querySelectorAll('span[data-ollama-id]');
    elements.forEach(span => {
        if (span.dataset.translated) {
            renderNode(span, newMode);
        }
    });
}

init();