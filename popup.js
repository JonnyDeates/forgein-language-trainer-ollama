document.addEventListener('DOMContentLoaded', () => {
    const mainView = document.getElementById('mainView');
    const settingsView = document.getElementById('settingsView');
    const settingsToggle = document.getElementById('settingsToggle');
    const headerTitle = document.getElementById('headerTitle');

    const enabledInput = document.getElementById('enabled');
    const langInput = document.getElementById('language');
    const scopeSelect = document.getElementById('scope');
    const allowDuplicatesInput = document.getElementById('allowDuplicates'); // New
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
    const saveSettingsBtn = document.getElementById('saveSettings');
    const statusSettings = document.getElementById('statusSettings');

    const DEFAULTS = {
        ollama: { endpoint: 'http://localhost:11434', model: 'llama3' },
        openai: { endpoint: 'https://api.openai.com/v1', model: 'gpt-4o-mini' },
        gemini: { endpoint: 'https://generativelanguage.googleapis.com/v1beta', model: 'gemini-1.5-flash' },
        claude: { endpoint: 'https://api.anthropic.com/v1', model: 'claude-3-5-sonnet-20240620' }
    };

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

    toggleManualBtn.addEventListener('click', () => {
        setModelUIMode('manual');
        modelInput.focus();
    });

    modelSelect.addEventListener('change', () => {
        modelInput.value = modelSelect.value;
    });

    settingsToggle.addEventListener('click', () => {
        if (mainView.style.display !== 'none') {
            mainView.style.display = 'none';
            settingsView.style.display = 'block';
            headerTitle.textContent = 'Configuration';
            settingsToggle.textContent = '←';
        } else {
            mainView.style.display = 'block';
            settingsView.style.display = 'none';
            headerTitle.textContent = 'Immersion';
            settingsToggle.textContent = '⚙️';
        }
    });

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

    chrome.storage.local.get(null, (data) => {
        if (data.enabled !== undefined) enabledInput.checked = data.enabled;
        if (data.language) langInput.value = data.language;
        if (data.scope) scopeSelect.value = data.scope;
        if (data.allowDuplicates !== undefined) allowDuplicatesInput.checked = data.allowDuplicates; // New
        if (data.percentage) percentageInput.value = data.percentage;
        if (data.displayMode) displayModeSelect.value = data.displayMode;

        if (data.provider) {
            providerSelect.value = data.provider;
            apiKeyField.style.display = data.provider === 'ollama' ? 'none' : 'block';
        }
        if (data.endpoint) endpointInput.value = data.endpoint;
        if (data.apiKey) apiKeyInput.value = data.apiKey;
        if (data.model) modelInput.value = data.model;
        if (data.customPrompt) customPromptInput.value = data.customPrompt;
    });

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
                        console.log("Retrying with 127.0.0.1...");
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
                models = ['gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-1.0-pro'];
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
            if (p === 'ollama') {
                statusSettings.textContent = 'Error: Is Ollama running with OLLAMA_ORIGINS="*"?';
            } else {
                statusSettings.textContent = `Error: ${e.message}`;
            }
            statusSettings.className = 'status error';
        }
    });

    const saveAll = (btn, statusEl) => {
        const settings = {
            enabled: enabledInput.checked,
            language: langInput.value,
            scope: scopeSelect.value,
            allowDuplicates: allowDuplicatesInput.checked, // New
            percentage: parseInt(percentageInput.value) || 10,
            displayMode: displayModeSelect.value,
            provider: providerSelect.value,
            endpoint: endpointInput.value.replace(/\/$/, ''),
            apiKey: apiKeyInput.value.trim(),
            model: modelInput.value.trim(),
            customPrompt: customPromptInput.value.trim()
        };

        chrome.storage.local.set(settings, () => {
            statusEl.textContent = 'Settings Saved!';
            statusEl.className = 'status success';

            chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
                if (tabs[0]) {
                    chrome.tabs.sendMessage(tabs[0].id, {
                        action: "updateDisplayMode",
                        mode: settings.displayMode
                    });
                }
            });
            setTimeout(() => statusEl.textContent = '', 2000);
        });
    };

    saveMainBtn.addEventListener('click', () => saveAll(saveMainBtn, statusMain));
    saveSettingsBtn.addEventListener('click', () => saveAll(saveSettingsBtn, statusSettings));
});