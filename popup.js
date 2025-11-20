document.addEventListener('DOMContentLoaded', () => {
    // UI References
    const mainView = document.getElementById('mainView');
    const settingsView = document.getElementById('settingsView');
    const blacklistView = document.getElementById('blacklistView');
    const headerTitle = document.getElementById('headerTitle');
    const settingsToggle = document.getElementById('settingsToggle');
    const blacklistToggle = document.getElementById('blacklistToggle');

    const enabledInput = document.getElementById('enabled');
    const ignoreSiteBtn = document.getElementById('ignoreSiteBtn');
    const langInput = document.getElementById('language');
    const scopeSelect = document.getElementById('scope');
    const allowDuplicatesInput = document.getElementById('allowDuplicates');
    const percentageInput = document.getElementById('percentage');
    const displayModeSelect = document.getElementById('displayMode');
    const saveMainBtn = document.getElementById('saveMain');
    const statusMain = document.getElementById('statusMain');

    const providerSelect = document.getElementById('provider');
    const endpointInput = document.getElementById('endpoint');
    const apiKeyInput = document.getElementById('apiKey');
    const apiKeyField = document.querySelector('.api-key-field');

    const modelInput = document.getElementById('modelInput');
    const modelSelect = document.getElementById('modelSelect');
    const toggleManualBtn = document.getElementById('toggleManual');
    const fetchModelsBtn = document.getElementById('fetchModels');

    const customPromptInput = document.getElementById('customPrompt');
    const blacklistInput = document.getElementById('blacklist');
    const saveBlacklistBtn = document.getElementById('saveBlacklist');
    const saveSettingsBtn = document.getElementById('saveSettings');
    const statusSettings = document.getElementById('statusSettings');
    const statusBlacklist = document.getElementById('statusBlacklist');

    let currentHostname = '';
    let lastSelectedProvider = 'ollama'; // Track previous to save state on switch

    // Default configurations for fresh installs
    const DEFAULT_CONFIGS = {
        ollama: { endpoint: 'http://localhost:11434', model: 'llama3', apiKey: '' },
        openai: { endpoint: 'https://api.openai.com/v1', model: 'gpt-4o-mini', apiKey: '' },
        gemini: { endpoint: 'https://generativelanguage.googleapis.com/v1beta', model: 'gemini-1.5-flash', apiKey: '' },
        claude: { endpoint: 'https://api.anthropic.com/v1', model: 'claude-3-5-sonnet-20240620', apiKey: '' }
    };

    // State container for the separate provider settings
    let providerConfigs = JSON.parse(JSON.stringify(DEFAULT_CONFIGS));

    // --- VIEW NAVIGATION ---
    const showView = (viewName) => {
        mainView.style.display = 'none';
        settingsView.style.display = 'none';
        blacklistView.style.display = 'none';

        settingsToggle.textContent = '⚙️';
        settingsToggle.style.display = 'flex';
        blacklistToggle.textContent = '🚫';
        blacklistToggle.style.display = 'flex';

        if (viewName === 'main') {
            mainView.style.display = 'block';
            headerTitle.textContent = 'Immersion';
        }
        else if (viewName === 'settings') {
            settingsView.style.display = 'block';
            headerTitle.textContent = 'Configuration';
            settingsToggle.textContent = '←';
            blacklistToggle.style.display = 'none';
        }
        else if (viewName === 'blacklist') {
            blacklistView.style.display = 'block';
            headerTitle.textContent = 'Blocked Sites';
            blacklistToggle.textContent = '←';
            settingsToggle.style.display = 'none';
        }
    };

    settingsToggle.addEventListener('click', () => {
        if (settingsView.style.display === 'block') showView('main'); else showView('settings');
    });
    blacklistToggle.addEventListener('click', () => {
        if (blacklistView.style.display === 'block') showView('main'); else showView('blacklist');
    });

    // --- HELPERS ---
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

    // Update UI fields from a specific config object
    const loadConfigToUI = (providerKey) => {
        const config = providerConfigs[providerKey] || DEFAULT_CONFIGS[providerKey];

        endpointInput.value = config.endpoint;
        apiKeyInput.value = config.apiKey || '';
        modelInput.value = config.model;

        // Reset UI visual state
        apiKeyField.style.display = providerKey === 'ollama' ? 'none' : 'block';
        modelInput.placeholder = `e.g. ${DEFAULT_CONFIGS[providerKey].model}`;
        statusSettings.textContent = '';

        // Reset Model UI to manual input
        setModelUIMode('manual');
    };

    // Capture UI fields into the config object
    const saveUIToConfig = (providerKey) => {
        if (!providerConfigs[providerKey]) providerConfigs[providerKey] = {};

        providerConfigs[providerKey].endpoint = endpointInput.value.replace(/\/$/, '');
        providerConfigs[providerKey].apiKey = apiKeyInput.value.trim();
        providerConfigs[providerKey].model = modelInput.value.trim();
    };

    // --- INITIALIZATION ---
    chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
        if (tabs[0] && tabs[0].url && !tabs[0].url.startsWith('chrome://')) {
            try {
                const url = new URL(tabs[0].url);
                currentHostname = url.hostname;
                ignoreSiteBtn.textContent = `🚫 Ignore ${currentHostname}`;
            } catch(e) { ignoreSiteBtn.disabled = true; }
        } else { ignoreSiteBtn.disabled = true; }
    });

    chrome.storage.local.get(null, (data) => {
        // Main Settings
        if (data.enabled !== undefined) enabledInput.checked = data.enabled;
        if (data.language) langInput.value = data.language;
        if (data.scope) scopeSelect.value = data.scope;
        if (data.allowDuplicates !== undefined) allowDuplicatesInput.checked = data.allowDuplicates;
        if (data.percentage) percentageInput.value = data.percentage;
        if (data.displayMode) displayModeSelect.value = data.displayMode;
        if (data.customPrompt) customPromptInput.value = data.customPrompt;

        // Load Blacklist
        const blacklist = data.blacklist || [];
        blacklistInput.value = blacklist.join('\n');
        if (currentHostname && blacklist.includes(currentHostname)) {
            setIgnoreButtonState(true);
        }

        // Load Cached Provider Configs
        if (data.providerConfigs) {
            providerConfigs = { ...DEFAULT_CONFIGS, ...data.providerConfigs };
        }

        // Set Current Provider UI
        if (data.provider) {
            providerSelect.value = data.provider;
            lastSelectedProvider = data.provider;
        }

        // Initial Load of fields based on selected provider
        loadConfigToUI(lastSelectedProvider);
    });

    // --- PROVIDER SWITCH LOGIC ---
    providerSelect.addEventListener('change', () => {
        const newProvider = providerSelect.value;

        // 1. Save current UI inputs to the OLD provider's cache slot
        saveUIToConfig(lastSelectedProvider);

        // 2. Load the NEW provider's settings into the UI
        loadConfigToUI(newProvider);

        // 3. Update tracker
        lastSelectedProvider = newProvider;
    });

    // --- SAVE ALL LOGIC ---
    const saveAll = (btn, statusEl) => {
        // 1. Capture current UI state into the cache object
        saveUIToConfig(providerSelect.value);

        const blacklistArr = blacklistInput.value.split('\n').map(s => s.trim()).filter(s => s);

        // 2. Determine current active settings to save flat (for content script ease)
        const currentConfig = providerConfigs[providerSelect.value];

        const settings = {
            // Global Settings
            enabled: enabledInput.checked,
            language: langInput.value,
            scope: scopeSelect.value,
            allowDuplicates: allowDuplicatesInput.checked,
            percentage: parseInt(percentageInput.value) || 10,
            displayMode: displayModeSelect.value,
            customPrompt: customPromptInput.value.trim(),
            blacklist: blacklistArr,

            // Active Provider Settings (Flat for easy access in background/content)
            provider: providerSelect.value,
            endpoint: currentConfig.endpoint,
            apiKey: currentConfig.apiKey,
            model: currentConfig.model,

            // Storage of the separated configs
            providerConfigs: providerConfigs
        };

        chrome.storage.local.set(settings, () => {
            if(statusEl) {
                statusEl.textContent = 'Saved!';
                statusEl.className = 'status success';
                setTimeout(() => statusEl.textContent = '', 1000);
            }

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

    // --- OTHER EVENTS ---
    enabledInput.addEventListener('change', () => saveAll(null, null));
    scopeSelect.addEventListener('change', () => saveAll(saveMainBtn, statusMain));
    langInput.addEventListener('change', () => saveAll(saveMainBtn, statusMain));
    percentageInput.addEventListener('change', () => saveAll(saveMainBtn, statusMain));
    allowDuplicatesInput.addEventListener('change', () => saveAll(saveMainBtn, statusMain));

    displayModeSelect.addEventListener('change', () => {
        chrome.storage.local.set({ displayMode: displayModeSelect.value });
        chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
            if (tabs[0]) {
                chrome.tabs.sendMessage(tabs[0].id, {
                    action: "updateDisplayMode",
                    mode: displayModeSelect.value
                });
            }
        });
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
        saveAll(null, null);
    });

    toggleManualBtn.addEventListener('click', () => {
        setModelUIMode('manual');
        modelInput.focus();
    });

    modelSelect.addEventListener('change', () => {
        modelInput.value = modelSelect.value;
    });

    fetchModelsBtn.addEventListener('click', async () => {
        const p = providerSelect.value;
        let ep = endpointInput.value.replace(/\/$/, '');
        const key = apiKeyInput.value;
        modelSelect.innerHTML = '';
        statusSettings.textContent = 'Fetching...';
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
                    } else { throw err; }
                }
            } else if (p === 'openai') {
                if (!key) throw new Error('API Key required');
                const res = await fetch(`${ep}/models`, { headers: { 'Authorization': `Bearer ${key}` } });
                if (!res.ok) throw new Error('OpenAI connection failed');
                const json = await res.json();
                models = json.data.filter(m => m.id.includes('gpt')).map(m => m.id).sort();
            } else if (p === 'gemini') {
                if (!key) throw new Error('API Key required');
                const res = await fetch(`${ep}/models?key=${key}`);
                if (!res.ok) throw new Error(`Gemini fetch failed: ${res.status}`);
                const json = await res.json();
                models = json.models.filter(m => m.supportedGenerationMethods && m.supportedGenerationMethods.includes("generateContent")).map(m => m.name.replace('models/', '')).sort();
            } else if (p === 'claude') {
                models = ['claude-3-5-sonnet-20240620', 'claude-3-opus-20240229', 'claude-3-haiku-20240307'];
            }

            if (models.length > 0) {
                models.forEach(m => {
                    const opt = document.createElement('option');
                    opt.value = m; opt.text = m;
                    modelSelect.appendChild(opt);
                });
                setModelUIMode('select');

                // Logic to ensure the dropdown matches the text input
                if (models.includes(modelInput.value)) {
                    modelSelect.value = modelInput.value;
                } else {
                    modelSelect.value = models[0];
                    modelInput.value = models[0];
                }

                statusSettings.textContent = `Success: ${models.length} models loaded.`;
                statusSettings.className = 'status success';
            } else { throw new Error('No models found'); }
        } catch (e) {
            console.error(e);
            setModelUIMode('manual');
            statusSettings.textContent = `Error: ${e.message}`;
            statusSettings.className = 'status error';
        }
    });

    saveMainBtn.addEventListener('click', () => saveAll(saveMainBtn, statusMain));
    saveSettingsBtn.addEventListener('click', () => saveAll(saveSettingsBtn, statusSettings));
    saveBlacklistBtn.addEventListener('click', () => saveAll(saveBlacklistBtn, statusBlacklist));
});