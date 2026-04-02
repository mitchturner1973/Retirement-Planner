/**
 * Floating chat widget UI – bottom-left chat bubble.
 * Renders a chat panel with message history, input, and settings.
 */

import { escapeHtml } from '../ui/dom.js';

export function createChatWidget({ chatService, document }) {
  let isOpen = false;
  let isSettingsOpen = false;
  let isLoading = false;

  // ── DOM references (set after mount) ──
  let fab, panel, messagesEl, inputEl, sendBtn, settingsBtn, settingsPane;
  let apiKeyInput, modelSelect, providerSelect, saveSettingsBtn, clearBtn, fetchModelsBtn;
  let anonymiseCheckbox, previewBtn, previewBox, sessionOnlyCheckbox;

  function mount() {
    fab = document.getElementById('chatFab');
    panel = document.getElementById('chatPanel');
    messagesEl = document.getElementById('chatMessages');
    inputEl = document.getElementById('chatInput');
    sendBtn = document.getElementById('chatSend');
    settingsBtn = document.getElementById('chatSettingsBtn');
    settingsPane = document.getElementById('chatSettings');
    apiKeyInput = document.getElementById('chatApiKey');
    modelSelect = document.getElementById('chatModel');
    providerSelect = document.getElementById('chatProvider');
    saveSettingsBtn = document.getElementById('chatSaveSettings');
    clearBtn = document.getElementById('chatClearBtn');
    fetchModelsBtn = document.getElementById('chatFetchModels');
    anonymiseCheckbox = document.getElementById('chatAnonymise');
    previewBtn = document.getElementById('chatPreviewData');
    previewBox = document.getElementById('chatPreviewBox');
    sessionOnlyCheckbox = document.getElementById('chatSessionOnly');

    if (!fab || !panel) return;

    // Restore saved settings into inputs
    providerSelect.value = chatService.getProvider();
    // Key display: show masked if persisted, or actual if session-only
    apiKeyInput.value = chatService.getApiKeySync();
    anonymiseCheckbox.checked = chatService.getAnonymise();
    if (sessionOnlyCheckbox) sessionOnlyCheckbox.checked = chatService.getSessionOnly();
    restoreModelSelect();

    // Update model placeholder when provider changes
    providerSelect.addEventListener('change', () => {
      // Clear the model list when switching providers
      modelSelect.innerHTML = '<option value="">-- Save API key, then fetch --</option>';
    });

    // Show settings pane if no API key configured
    if (!chatService.hasApiKey()) {
      isSettingsOpen = true;
      settingsPane.style.display = 'block';
    }

    fab.addEventListener('click', toggle);
    document.getElementById('chatCloseBtn').addEventListener('click', () => toggle(false));
    sendBtn.addEventListener('click', handleSend);
    inputEl.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
    });
    settingsBtn.addEventListener('click', toggleSettings);
    saveSettingsBtn.addEventListener('click', saveSettings);
    clearBtn.addEventListener('click', clearChat);
    fetchModelsBtn.addEventListener('click', fetchModels);
    previewBtn.addEventListener('click', togglePreview);

    // Add welcome message
    addMessage('assistant', 'Hi! I\'m your pension assistant. Ask me anything about your retirement plan — I can see all the data you\'ve entered.\n\n**Data questions** (answered instantly, no API call):\n• "What is my pot?" / "Am I on track?"\n• "What will my pot be at 60?"\n\n**Explanations** (uses AI):\n• "Explain what PCLS means"\n• "What happens if I retire early?"');
  }

  function restoreModelSelect() {
    const saved = chatService.getModel();
    const effective = chatService.getEffectiveModel();
    // If there's a saved model, add it as the selected option
    if (saved || effective) {
      const val = saved || effective;
      modelSelect.innerHTML = `<option value="${escapeHtml(val)}">${escapeHtml(val)}</option>`;
      modelSelect.value = val;
    }
  }

  async function fetchModels() {
    const key = apiKeyInput.value.trim();
    if (!key) {
      addMessage('assistant', '⚠️ Please enter your API key first, then click 🔄 to fetch models.');
      return;
    }
    // Temporarily save key so listModels can use it
    chatService.setProvider(providerSelect.value);
    chatService.setApiKey(key);

    fetchModelsBtn.disabled = true;
    fetchModelsBtn.textContent = '…';
    try {
      const models = await chatService.listModels();
      modelSelect.innerHTML = '';
      if (models.length === 0) {
        modelSelect.innerHTML = '<option value="">No models found</option>';
        return;
      }
      const effective = chatService.getEffectiveModel();
      for (const m of models) {
        const opt = document.createElement('option');
        opt.value = m.id;
        opt.textContent = m.label;
        if (m.id === effective) opt.selected = true;
        modelSelect.appendChild(opt);
      }
      // If no option was selected, select the default
      if (!modelSelect.value && models.length) {
        const def = chatService.PROVIDERS[providerSelect.value]?.defaultModel;
        const defOpt = [...modelSelect.options].find(o => o.value === def);
        if (defOpt) defOpt.selected = true;
        else modelSelect.selectedIndex = 0;
      }
    } catch (err) {
      if (err.message === 'INVALID_API_KEY') {
        addMessage('assistant', '⚠️ API key is invalid. Please check and try again.');
      } else {
        addMessage('assistant', `⚠️ Could not fetch models: ${escapeHtml(err.message)}`);
      }
    } finally {
      fetchModelsBtn.disabled = false;
      fetchModelsBtn.textContent = '🔄';
    }
  }

  function toggle(forceState) {
    isOpen = typeof forceState === 'boolean' ? forceState : !isOpen;
    panel.classList.toggle('chat-panel--open', isOpen);
    fab.classList.toggle('chat-fab--hidden', isOpen);
    if (isOpen) inputEl.focus();
  }

  function toggleSettings() {
    isSettingsOpen = !isSettingsOpen;
    settingsPane.style.display = isSettingsOpen ? 'block' : 'none';
  }

  async function saveSettings() {
    chatService.setProvider(providerSelect.value);
    if (sessionOnlyCheckbox) chatService.setSessionOnly(sessionOnlyCheckbox.checked);
    await chatService.setApiKey(apiKeyInput.value.trim());
    chatService.setModel(modelSelect.value);
    chatService.setAnonymise(anonymiseCheckbox.checked);
    isSettingsOpen = false;
    settingsPane.style.display = 'none';
    previewBox.style.display = 'none';
    const privacyNote = anonymiseCheckbox.checked
      ? '🔒 Data anonymisation is ON — values are rounded and personal details removed before sending.'
      : '⚠️ Data anonymisation is OFF — exact values and dates will be sent to the AI provider.';
    const sessionNote = (sessionOnlyCheckbox?.checked)
      ? '\n🔑 Session-only mode: your API key is held in memory only and will be forgotten when you close the tab.'
      : '\n🔐 API key is encrypted and stored in your browser.';
    addMessage('assistant', `Settings saved. ${privacyNote}${sessionNote}`);
  }

  function clearChat() {
    chatService.clearHistory();
    messagesEl.innerHTML = '';
    addMessage('assistant', 'Chat cleared. Ask me anything about your pension plan!');
  }

  function togglePreview() {
    if (previewBox.style.display === 'none') {
      // Temporarily apply the checkbox state so preview reflects it
      chatService.setAnonymise(anonymiseCheckbox.checked);
      const preview = chatService.buildContextPreview();
      previewBox.textContent = preview;
      previewBox.style.display = 'block';
      previewBtn.textContent = '🙈 Hide';
    } else {
      previewBox.style.display = 'none';
      previewBtn.textContent = '👁 Preview';
    }
  }

  async function handleSend() {
    const text = inputEl.value.trim();
    if (!text || isLoading) return;

    addMessage('user', text);
    inputEl.value = '';
    isLoading = true;
    sendBtn.disabled = true;

    // Show typing indicator
    const typingEl = addTypingIndicator();

    try {
      const result = await chatService.sendMessage(text);
      typingEl.remove();
      // result is { text, source } – source is 'local' or 'llm'
      const reply = typeof result === 'string' ? result : result.text;
      addMessage('assistant', reply);
    } catch (err) {
      typingEl.remove();
      if (err.message === 'NO_API_KEY') {
        addMessage('assistant', '⚠️ I couldn\'t answer that locally. Please set your API key in settings (⚙️) to enable AI-powered answers for explanations and advice.');
        isSettingsOpen = true;
        settingsPane.style.display = 'block';
      } else if (err.message === 'INVALID_API_KEY') {
        addMessage('assistant', '⚠️ Your API key appears to be invalid. Please check it in settings.');
      } else {
        addMessage('assistant', `⚠️ Error: ${escapeHtml(err.message)}`);
      }
    } finally {
      isLoading = false;
      sendBtn.disabled = false;
      inputEl.focus();
    }
  }

  function addMessage(role, content) {
    const wrap = document.createElement('div');
    wrap.className = `chat-msg chat-msg--${role}`;

    const bubble = document.createElement('div');
    bubble.className = 'chat-bubble';
    bubble.innerHTML = formatMessage(content);

    wrap.appendChild(bubble);
    messagesEl.appendChild(wrap);
    messagesEl.scrollTop = messagesEl.scrollHeight;
    return wrap;
  }

  function addTypingIndicator() {
    const wrap = document.createElement('div');
    wrap.className = 'chat-msg chat-msg--assistant';
    wrap.innerHTML = '<div class="chat-bubble chat-typing"><span></span><span></span><span></span></div>';
    messagesEl.appendChild(wrap);
    messagesEl.scrollTop = messagesEl.scrollHeight;
    return wrap;
  }

  function formatMessage(text) {
    // Simple markdown-ish formatting
    let html = escapeHtml(text);
    // Bold
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    // Bullet points
    html = html.replace(/^[•\-]\s+(.+)$/gm, '<li>$1</li>');
    html = html.replace(/(<li>.*<\/li>)/gs, '<ul>$1</ul>');
    // Clean up nested <ul> tags
    html = html.replace(/<\/ul>\s*<ul>/g, '');
    // Line breaks
    html = html.replace(/\n/g, '<br>');
    return html;
  }

  return { mount };
}
