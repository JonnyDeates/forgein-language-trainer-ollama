document.addEventListener('DOMContentLoaded', () => {
    // UI Views
    const mainView = document.getElementById('mainView');
    const settingsView = document.getElementById('settingsView');
    const blacklistView = document.getElementById('blacklistView');

    // Header
    const headerTitle = document.getElementById('headerTitle');
    const settingsToggle = document.getElementById('settingsToggle');
    const blacklistToggle = document.getElementById('blacklistToggle');

    // Main Inputs
    const enabledInput = document.getElementById('enabled');
    const ignoreSiteBtn = document.getElementById('ignoreSiteBtn');
    const langInput = document.getElementById('language');
    const scopeSelect = document.getElementById('scope');
    const allowDuplicatesInput = document.getElementById('allowDuplicates');
    const percentageInput = document.getElementById('percentage');
    const displayModeSelect = document.getElementById('displayMode');
    const saveMainBtn = document.getElementById('saveMain');
    const statusMain = document.getElementById('statusMain');

    // Settings Inputs
    const providerSelect = document.getElementById('provider');
    const endpointInput = document.getElementById('endpoint');
    const apiKeyInput = document.getElementById('apiKey');
    const apiKeyField = document.querySelector('.api-key-field');
    const modelInput = document.getElementById('modelInput');
    const modelSelect = document.getElementById('modelSelect');
    const toggleManualBtn = document.getElementById('toggleManual');
    const fetchModelsBtn = document.getElementById('fetchModels');
    const customPromptInput = document.getElementById('customPrompt');
    const saveSettingsBtn = document.getElementById('saveSettings');
    const statusSettings = document.getElementById('statusSettings');

    // Blacklist Inputs
    const blacklistInput = document.getElementById('blacklist');
    const saveBlacklistBtn = document.getElementById('saveBlacklist');
    const statusBlacklist = document.getElementById('statusBlacklist');

    let currentHostname = '';

    const DEFAULTS = {
        ollama: { endpoint: 'http://localhost:11434', model: 'llama3' },
        openai: { endpoint: 'https://api.openai.com/v1', model: 'gpt-4o-mini' },
        gemini: { endpoint: 'https://generativelanguage.googleapis.com/v1beta', model: 'gemini-1.5-flash' },
        claude: { endpoint: 'https://api.anthropic.com/v1', model: 'claude-3-5-sonnet-20240620' }
    };

    // --- NAVIGATION LOGIC ---
    const showView = (viewName) => {
        // Hide all
        mainView.style.display = 'none';
        settingsView.style.display = 'none';
        blacklistView.style.display = 'none';

        // Reset Icons
        settingsToggle.textContent = '⚙️';
        settingsToggle.style.display = 'flex'; // Flex to center icon
        blacklistToggle.textContent = '🚫';
        blacklistToggle.style.display = 'flex';

        if (viewName === 'main') {
            mainView.style.display = 'block';
            headerTitle.textContent = 'Immersion';
        }
        else if (viewName === 'settings') {
            settingsView.style.display = 'block';
            headerTitle.textContent = 'Configuration';
            // Show Back button on the Settings Icon
            settingsToggle.textContent = '←';
            // Hide the other icon to avoid confusion
            blacklistToggle.style.display = 'none';
        }
        else if (viewName === 'blacklist') {
            blacklistView.style.display = 'block';
            headerTitle.textContent = 'Blocked Sites';
            // Show Back button on the Blacklist Icon
            blacklistToggle.textContent = '←';
            settingsToggle.style.display = 'none';
        }
    };

    // Nav Click Handlers
    settingsToggle.addEventListener('click', () => {
        if (settingsView.style.display === 'block') {
            showView('main'); // Go Back
        } else {
            showView('settings');
        }
    });

    blacklistToggle.addEventListener('click', () => {
        if (blacklistView.style.display === 'block') {
            showView('main'); // Go Back
        } else {
            showView('blacklist');
        }
    });

    // --- INITIALIZE ---

    // Helpers
    const setModelUIMode = (mode) => {
        if (mode === 'select') {
            modelInput.style.display = 'none';
            modelSelect.style.display = 'block';
            toggleManualBtn.style.display = 'block';
        } else {
            modelInput.style.display = 'block';
            modelSelect.style.display = 'none';
            toggleManualBtn.style.display = 'none';
        }
    };

    function setIgnoreButtonState(isIgnored) {
        if (isIgnored) {
            ignoreSiteBtn.textContent = `✅ Enable on ${currentHostname}`;
            ignoreSiteBtn.style.backgroundColor = "#d1fae5";
            ignoreSiteBtn.style.color = "#065f46";
            ignoreSiteBtn.style.borderColor = "#34d399";
        } else {
            ignoreSiteBtn.textContent = `🚫 Ignore ${currentHostname}`;
            ignoreSiteBtn.style.backgroundColor = "";
            ignoreSiteBtn.style.color = "";
            ignoreSiteBtn.style.borderColor = "";
        }
    }

    // Get Current Tab Info
    chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
        if (tabs[0] && tabs[0].url && !tabs[0].url.startsWith('chrome://')) {
            try {
                const url = new URL(tabs[0].url);
                currentHostname = url.hostname;
                ignoreSiteBtn.textContent = `🚫 Ignore ${currentHostname}`;
            } catch(e) {
                ignoreSiteBtn.disabled = true;
            }
        } else {
            ignoreSiteBtn.disabled = true;
        }
    });

    // Load All Settings
    chrome.storage.local.get(null, (data) => {
        // Main
        if (data.enabled !== undefined) enabledInput.checked = data.enabled;
        if (data.language) langInput.value = data.language;
        if (data.scope) scopeSelect.value = data.scope;
        if (data.allowDuplicates !== undefined) allowDuplicatesInput.checked = data.allowDuplicates;
        if (data.percentage) percentageInput.value = data.percentage;
        if (data.displayMode) displayModeSelect.value = data.displayMode;

        // Settings
        if (data.provider) {
            providerSelect.value = data.provider;
            apiKeyField.style.display = data.provider === 'ollama' ? 'none' : 'block';
        }
        if (data.endpoint) endpointInput.value = data.endpoint;
        if (data.apiKey) apiKeyInput.value = data.apiKey;
        if (data.model) modelInput.value = data.model;
        if (data.customPrompt) customPromptInput.value = data.customPrompt;

        // Blacklist
        const blacklist = data.blacklist || [];
        blacklistInput.value = blacklist.join('\n');

        // Check Ignore Status
        if (currentHostname && blacklist.includes(currentHostname)) {
            setIgnoreButtonState(true);
        }
    });

    // --- INTERACTION HANDLERS ---

    providerSelect.addEventListener('change', () => {
        const p = providerSelect.value;
        apiKeyField.style.display = p === 'ollama' ? 'none' : 'block';
        setModelUIMode('manual');

        if (!endpointInput.value || endpointInput.value.includes('localhost') || endpointInput.value.includes('api.openai') || endpointInput.value.includes('anthropic') || endpointInput.value.includes('googleapis')) {
            endpointInput.value = DEFAULTS[p].endpoint;
        }
        modelInput.value = DEFAULTS[p].model;
        modelInput.placeholder = `e.g. ${DEFAULTS[p].model}`;
        statusSettings.textContent = '';
    });

    toggleManualBtn.addEventListener('click', () => {
        setModelUIMode('manual');
        modelInput.focus();
    });

    modelSelect.addEventListener('change', () => {
        modelInput.value = modelSelect.value;
    });

    ignoreSiteBtn.addEventListener('click', () => {
        if (!currentHostname) return;
        let domains = blacklistInput.value.split('\n').map(s => s.trim()).filter(s => s);

        if (domains.includes(currentHostname)) {
            domains = domains.filter(d => d !== currentHostname);
            setIgnoreButtonState(false);
        } else {
            domains.push(currentHostname);
            setIgnoreButtonState(true);
        }
        blacklistInput.value = domains.join('\n');
        saveAll(saveMainBtn, statusMain); // Auto save
    });

    // Fetch Models
    fetchModelsBtn.addEventListener('click', async () => {
        const p = providerSelect.value;
        let ep = endpointInput.value.replace(/\/$/, '');
        const key = apiKeyInput.value;

        modelSelect.innerHTML = '';
        statusSettings.textContent = 'Fetching models...';
        statusSettings.className = 'status';

        try {
            let models = [];

            if (p === 'ollama') {
                try {
                    const res = await fetch(`${ep}/api/tags?t=${Date.now()}`);
                    if (!res.ok) throw new Error('Connection failed');
                    const json = await res.json();
                    models = json.models.map(m => m.name);
                } catch (err) {
                    if (ep.includes('localhost')) {
                        const altEp = ep.replace('localhost', '127.0.0.1');
                        const res = await fetch(`${altEp}/api/tags`);
                        if (!res.ok) throw new Error('Connection failed on 127.0.0.1');
                        const json = await res.json();
                        models = json.models.map(m => m.name);
                    } else {
                        throw err;
                    }
                }
            }
            else if (p === 'openai') {
                if (!key) throw new Error('Enter API Key first');
                const res = await fetch(`${ep}/models`, { headers: { 'Authorization': `Bearer ${key}` } });
                if (res.status === 401) throw new Error('Invalid API Key');
                if (!res.ok) throw new Error('OpenAI connection failed');
                const json = await res.json();
                models = json.data.filter(m => m.id.includes('gpt')).map(m => m.id).sort();
            }
            else if (p === 'gemini') {
                if (!key) throw new Error('Enter API Key first');
                const res = await fetch(`${ep}/models?key=${key}`);
                if (!res.ok) throw new Error(`Gemini fetch failed: ${res.status}`);
                const json = await res.json();
                models = json.models
                    .filter(m => m.supportedGenerationMethods && m.supportedGenerationMethods.includes("generateContent"))
                    .map(m => m.name.replace('models/', ''))
                    .sort();
            }
            else if (p === 'claude') {
                models = ['claude-3-5-sonnet-20240620', 'claude-3-opus-20240229', 'claude-3-haiku-20240307'];
            }

            if (models.length > 0) {
                models.forEach(m => {
                    const opt = document.createElement('option');
                    opt.value = m;
                    opt.text = m;
                    modelSelect.appendChild(opt);
                });

                setModelUIMode('select');

                if (models.includes(modelInput.value)) {
                    modelSelect.value = modelInput.value;
                } else {
                    modelSelect.value = models[0];
                    modelInput.value = models[0];
                }

                statusSettings.textContent = `Success: ${models.length} models loaded.`;
                statusSettings.className = 'status success';
            } else {
                throw new Error('No models found');
            }

        } catch (e) {
            console.error(e);
            setModelUIMode('manual');
            statusSettings.textContent = `Error: ${e.message}`;
            statusSettings.className = 'status error';
        }
    });

    // --- GLOBAL SAVE ---
    const saveAll = (btn, statusEl) => {
        const blacklistArr = blacklistInput.value.split('\n').map(s => s.trim()).filter(s => s);

        const settings = {
            enabled: enabledInput.checked,
            language: langInput.value,
            scope: scopeSelect.value,
            allowDuplicates: allowDuplicatesInput.checked,
            percentage: parseInt(percentageInput.value) || 10,
            displayMode: displayModeSelect.value,

            provider: providerSelect.value,
            endpoint: endpointInput.value.replace(/\/$/, ''),
            apiKey: apiKeyInput.value.trim(),
            model: modelInput.value.trim(),
            customPrompt: customPromptInput.value.trim(),

            blacklist: blacklistArr
        };

        chrome.storage.local.set(settings, () => {
            if(statusEl) {
                statusEl.textContent = 'Saved!';
                statusEl.className = 'status success';
                setTimeout(() => statusEl.textContent = '', 2000);
            }

            // Check if ACTIVE on this page
            const isActive = settings.enabled && !settings.blacklist.includes(currentHostname);

            chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
                if (tabs[0]) {
                    chrome.tabs.sendMessage(tabs[0].id, {
                        action: "updateState",
                        active: isActive,
                        settings: settings
                    });
                }
            });
        });
    };

    saveMainBtn.addEventListener('click', () => saveAll(saveMainBtn, statusMain));
    saveSettingsBtn.addEventListener('click', () => saveAll(saveSettingsBtn, statusSettings));
    saveBlacklistBtn.addEventListener('click', () => saveAll(saveBlacklistBtn, statusBlacklist));
});