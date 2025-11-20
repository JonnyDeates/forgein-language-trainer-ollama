document.addEventListener('DOMContentLoaded', () => {
    const enabledInput = document.getElementById('enabled');
    const scopeSelect = document.getElementById('scope');
    const displayModeSelect = document.getElementById('displayMode');
    const percentageInput = document.getElementById('percentage');
    const modelSelect = document.getElementById('model');
    const langInput = document.getElementById('language');
    const saveBtn = document.getElementById('save');
    const statusDiv = document.getElementById('status');

    // 1. Load saved settings
    chrome.storage.local.get(['enabled', 'scope', 'displayMode', 'percentage', 'model', 'language'], (result) => {
        if (result.enabled !== undefined) enabledInput.checked = result.enabled;
        if (result.scope) scopeSelect.value = result.scope;
        if (result.displayMode) displayModeSelect.value = result.displayMode;
        if (result.percentage) percentageInput.value = result.percentage;
        if (result.language) langInput.value = result.language;

        fetchModels(result.model);
    });

    // 2. Instant Mode Change Listener
    displayModeSelect.addEventListener('change', () => {
        const newMode = displayModeSelect.value;
        chrome.storage.local.set({ displayMode: newMode });
        chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
            if (tabs[0]) {
                chrome.tabs.sendMessage(tabs[0].id, {
                    action: "updateDisplayMode",
                    mode: newMode
                });
            }
        });
    });

    async function fetchModels(savedModel) {
        try {
            const response = await fetch('http://localhost:11434/api/tags');
            if (!response.ok) throw new Error('Failed to connect');
            const data = await response.json();
            const models = data.models || [];

            modelSelect.innerHTML = '';
            if (models.length === 0) {
                modelSelect.add(new Option("No models found (run 'ollama pull')", ""));
                return;
            }

            models.forEach(m => {
                const option = document.createElement('option');
                option.value = m.name;
                option.text = m.name;
                modelSelect.appendChild(option);
            });

            if (savedModel && models.some(m => m.name === savedModel)) {
                modelSelect.value = savedModel;
            } else {
                const defaultModel = models.find(m => m.name.includes('llama3')) || models[0];
                modelSelect.value = defaultModel.name;
            }
            statusDiv.textContent = '';

        } catch (error) {
            console.error(error);
            modelSelect.innerHTML = '<option value="" disabled selected>Connection Failed</option>';
            statusDiv.textContent = 'Error: Is Ollama running?';
            statusDiv.className = 'status error';
        }
    }

    // Save settings
    saveBtn.addEventListener('click', () => {
        const selectedModel = modelSelect.value;
        if (!selectedModel) {
            statusDiv.textContent = 'Error: No model selected.';
            statusDiv.className = 'status error';
            return;
        }

        const settings = {
            enabled: enabledInput.checked,
            scope: scopeSelect.value, // New
            displayMode: displayModeSelect.value,
            percentage: parseInt(percentageInput.value) || 10,
            model: selectedModel,
            language: langInput.value.trim() || 'Spanish'
        };

        chrome.storage.local.set(settings, () => {
            statusDiv.textContent = 'Settings saved! Refresh page to apply.';
            statusDiv.className = 'status success';
            setTimeout(() => statusDiv.textContent = '', 3000);
        });
    });
});