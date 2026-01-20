/**
 * LLM Synthesizer - Main Application
 * Multi-LLM Chat Interface
 */

(function () {
    'use strict';

    // ===== Application State =====
    const state = {
        currentChatId: null,
        messages: [],
        selectedModels: ['chatgpt', 'gemini', 'claude', 'grok'],
        viewMode: 'unified', // 'unified' or 'split'
        isLoading: false,
        streamingResponses: {},
        chatHistory: []
    };

    // ===== DOM Elements =====
    const elements = {
        // Sidebar
        sidebar: document.getElementById('sidebar'),
        sidebarToggle: document.getElementById('sidebarToggle'),
        newChatBtn: document.getElementById('newChatBtn'),
        historyBtn: document.getElementById('historyBtn'),
        exportBtn: document.getElementById('exportBtn'),
        themeToggle: document.getElementById('themeToggle'),
        settingsBtn: document.getElementById('settingsBtn'),
        mobileMenuBtn: document.getElementById('mobileMenuBtn'),

        // Chat
        chatTitle: document.getElementById('chatTitle'),
        chatMessages: document.getElementById('chatMessages'),
        welcomeScreen: document.getElementById('welcomeScreen'),
        apiStatus: document.getElementById('apiStatus'),

        // View Toggle
        unifiedViewBtn: document.getElementById('unifiedViewBtn'),
        splitViewBtn: document.getElementById('splitViewBtn'),

        // Input
        messageInput: document.getElementById('messageInput'),
        sendBtn: document.getElementById('sendBtn'),
        charCount: document.getElementById('charCount'),
        modelSelector: document.getElementById('modelSelector'),

        // Modals
        settingsModal: document.getElementById('settingsModal'),
        historyModal: document.getElementById('historyModal'),
        exportModal: document.getElementById('exportModal'),

        // Settings
        openaiKey: document.getElementById('openaiKey'),
        geminiKey: document.getElementById('geminiKey'),
        claudeKey: document.getElementById('claudeKey'),
        grokKey: document.getElementById('grokKey'),
        defaultView: document.getElementById('defaultView'),
        streamResponses: document.getElementById('streamResponses'),
        saveSettingsBtn: document.getElementById('saveSettingsBtn'),
        clearDataBtn: document.getElementById('clearDataBtn'),

        // History
        historyList: document.getElementById('historyList'),

        // Export
        exportJson: document.getElementById('exportJson'),
        exportMarkdown: document.getElementById('exportMarkdown'),

        // Toast
        toastContainer: document.getElementById('toastContainer')
    };

    // ===== Initialization =====
    function init() {
        loadSettings();
        loadChatHistory();
        setupEventListeners();
        updateAPIStatus();
        restoreTheme();

        // Generate unique chat ID
        state.currentChatId = generateId();
    }

    function generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    // ===== Settings =====
    function loadSettings() {
        // Load API keys (already handled by individual APIs)
        elements.openaiKey.value = localStorage.getItem('openai_api_key') || '';
        elements.geminiKey.value = localStorage.getItem('gemini_api_key') || '';
        elements.claudeKey.value = localStorage.getItem('claude_api_key') || '';
        elements.grokKey.value = localStorage.getItem('grok_api_key') || '';

        // Load preferences
        const defaultView = localStorage.getItem('default_view') || 'unified';
        elements.defaultView.value = defaultView;
        state.viewMode = defaultView;
        updateViewButtons();

        const streamEnabled = localStorage.getItem('stream_responses') !== 'false';
        elements.streamResponses.checked = streamEnabled;

        // Load selected models
        const savedModels = localStorage.getItem('selected_models');
        if (savedModels) {
            state.selectedModels = JSON.parse(savedModels);
            updateModelPills();
        }
    }

    function saveSettings() {
        // Log what we're saving for debugging
        console.log('Saving API keys...');
        console.log('OpenAI key length:', elements.openaiKey.value.trim().length);
        console.log('Gemini key length:', elements.geminiKey.value.trim().length);
        console.log('Claude key length:', elements.claudeKey.value.trim().length);
        console.log('Grok key length:', elements.grokKey.value.trim().length);

        localStorage.setItem('openai_api_key', elements.openaiKey.value.trim());
        localStorage.setItem('gemini_api_key', elements.geminiKey.value.trim());
        localStorage.setItem('claude_api_key', elements.claudeKey.value.trim());
        localStorage.setItem('grok_api_key', elements.grokKey.value.trim());
        localStorage.setItem('default_view', elements.defaultView.value);
        localStorage.setItem('stream_responses', elements.streamResponses.checked);

        // Verify the keys were saved
        console.log('Verification - OpenAI configured:', OpenAIAPI.isConfigured());
        console.log('Verification - Gemini configured:', GeminiAPI.isConfigured());
        console.log('Verification - Claude configured:', ClaudeAPI.isConfigured());
        console.log('Verification - Grok configured:', GrokAPI.isConfigured());

        state.viewMode = elements.defaultView.value;
        updateViewButtons();
        updateAPIStatus();

        showToast('Settings saved successfully!', 'success');
        closeModal('settings');
    }

    function clearAllData() {
        if (confirm('Are you sure you want to clear all data? This will remove your API keys, chat history, and preferences.')) {
            localStorage.clear();
            state.messages = [];
            state.chatHistory = [];
            state.currentChatId = generateId();

            elements.openaiKey.value = '';
            elements.geminiKey.value = '';
            elements.claudeKey.value = '';
            elements.grokKey.value = '';

            renderMessages();
            updateAPIStatus();
            showToast('All data cleared', 'info');
            closeModal('settings');
        }
    }

    function updateAPIStatus() {
        const configured = [
            OpenAIAPI.isConfigured(),
            GeminiAPI.isConfigured(),
            ClaudeAPI.isConfigured(),
            GrokAPI.isConfigured()
        ].filter(Boolean).length;

        const warning = elements.apiStatus.querySelector('.api-warning');
        if (configured > 0) {
            warning.classList.add('hidden');
        } else {
            warning.classList.remove('hidden');
        }
    }

    // ===== Theme =====
    function restoreTheme() {
        const savedTheme = localStorage.getItem('theme') || 'dark';
        document.documentElement.setAttribute('data-theme', savedTheme);
    }

    function toggleTheme() {
        const current = document.documentElement.getAttribute('data-theme') || 'dark';
        const next = current === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', next);
        localStorage.setItem('theme', next);
    }

    // ===== View Mode =====
    function updateViewButtons() {
        elements.unifiedViewBtn.classList.toggle('active', state.viewMode === 'unified');
        elements.splitViewBtn.classList.toggle('active', state.viewMode === 'split');
    }

    function setViewMode(mode) {
        state.viewMode = mode;
        updateViewButtons();
        renderMessages();
    }

    // ===== Model Selection =====
    function updateModelPills() {
        const pills = elements.modelSelector.querySelectorAll('.model-pill');
        pills.forEach(pill => {
            const model = pill.dataset.model;
            pill.classList.toggle('active', state.selectedModels.includes(model));
        });
    }

    function toggleModel(model) {
        const index = state.selectedModels.indexOf(model);

        if (index > -1) {
            // Don't allow removing the last model
            if (state.selectedModels.length === 1) {
                showToast('At least one model must be selected', 'warning');
                return;
            }
            state.selectedModels.splice(index, 1);
        } else {
            state.selectedModels.push(model);
        }

        localStorage.setItem('selected_models', JSON.stringify(state.selectedModels));
        updateModelPills();
    }

    // ===== Chat History =====
    function loadChatHistory() {
        const saved = localStorage.getItem('chat_history');
        if (saved) {
            state.chatHistory = JSON.parse(saved);
        }
    }

    function saveChatHistory() {
        // Update current chat in history
        if (state.messages.length > 0) {
            const existingIndex = state.chatHistory.findIndex(c => c.id === state.currentChatId);
            const chatData = {
                id: state.currentChatId,
                title: getChatTitle(),
                messages: state.messages,
                timestamp: Date.now()
            };

            if (existingIndex > -1) {
                state.chatHistory[existingIndex] = chatData;
            } else {
                state.chatHistory.unshift(chatData);
            }

            // Keep only last 50 chats
            state.chatHistory = state.chatHistory.slice(0, 50);
            localStorage.setItem('chat_history', JSON.stringify(state.chatHistory));
        }
    }

    function getChatTitle() {
        const firstUserMessage = state.messages.find(m => m.role === 'user');
        if (firstUserMessage) {
            return firstUserMessage.content.substring(0, 50) + (firstUserMessage.content.length > 50 ? '...' : '');
        }
        return 'New Chat';
    }

    function loadChat(chatId) {
        const chat = state.chatHistory.find(c => c.id === chatId);
        if (chat) {
            state.currentChatId = chatId;
            state.messages = chat.messages;
            elements.chatTitle.textContent = chat.title;
            renderMessages();
            closeModal('history');
        }
    }

    function deleteChat(chatId) {
        state.chatHistory = state.chatHistory.filter(c => c.id !== chatId);
        localStorage.setItem('chat_history', JSON.stringify(state.chatHistory));
        renderHistoryList();

        if (chatId === state.currentChatId) {
            newChat();
        }
    }

    function newChat() {
        saveChatHistory();
        state.currentChatId = generateId();
        state.messages = [];
        state.streamingResponses = {};
        elements.chatTitle.textContent = 'New Chat';
        renderMessages();
    }

    function renderHistoryList() {
        if (state.chatHistory.length === 0) {
            elements.historyList.innerHTML = '<p class="empty-state">No chat history yet. Start a conversation!</p>';
            return;
        }

        elements.historyList.innerHTML = state.chatHistory.map(chat => `
            <div class="history-item" data-chat-id="${chat.id}">
                <div class="history-item-info">
                    <span class="history-item-title">${escapeHtml(chat.title)}</span>
                    <span class="history-item-date">${formatDate(chat.timestamp)}</span>
                </div>
                <button class="history-item-delete" data-chat-id="${chat.id}" title="Delete">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="3 6 5 6 21 6"></polyline>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    </svg>
                </button>
            </div>
        `).join('');
    }

    // ===== Message Handling =====
    async function sendMessage() {
        const content = elements.messageInput.value.trim();
        if (!content || state.isLoading) return;

        // Check if any models are configured
        const activeModels = Synthesizer.getActiveModels(state.selectedModels);
        console.log('Selected models:', state.selectedModels);
        console.log('Active (configured) models:', activeModels);

        if (activeModels.length === 0) {
            console.warn('No active models configured! Selected models:', state.selectedModels);
            console.warn('API Configuration status:', {
                OpenAI: typeof OpenAIAPI !== 'undefined' ? OpenAIAPI.isConfigured() : 'API not loaded',
                Gemini: typeof GeminiAPI !== 'undefined' ? GeminiAPI.isConfigured() : 'API not loaded',
                Claude: typeof ClaudeAPI !== 'undefined' ? ClaudeAPI.isConfigured() : 'API not loaded',
                Grok: typeof GrokAPI !== 'undefined' ? GrokAPI.isConfigured() : 'API not loaded'
            });
            showToast('Please configure API keys in Settings', 'warning');
            openModal('settings');
            return;
        }

        // Add user message
        state.messages.push({
            role: 'user',
            content: content,
            timestamp: Date.now()
        });

        // Clear input
        elements.messageInput.value = '';
        elements.charCount.textContent = '0';
        autoResizeTextarea();

        // Update UI
        elements.welcomeScreen.style.display = 'none';
        elements.chatTitle.textContent = getChatTitle();
        renderMessages();
        scrollToBottom();

        // Show loading
        state.isLoading = true;
        elements.sendBtn.disabled = true;
        showLoadingIndicator();

        try {
            // Build message history for API
            const apiMessages = state.messages.map(m => ({
                role: m.role,
                content: m.content
            }));

            let responses;
            const useStreaming = elements.streamResponses.checked;

            if (useStreaming) {
                // Initialize streaming responses
                state.streamingResponses = {};
                activeModels.forEach(model => {
                    state.streamingResponses[model] = '';
                });

                // Start streaming
                responses = await Synthesizer.streamAll(
                    state.selectedModels,
                    apiMessages,
                    (model, chunk, full) => {
                        state.streamingResponses[model] = full;
                        updateStreamingResponse(model, full);
                    },
                    (model, result) => {
                        // Model completed
                    }
                );
            } else {
                responses = await Synthesizer.queryAll(state.selectedModels, apiMessages);
            }

            // Add assistant response
            const synthesized = Synthesizer.synthesize(responses);
            state.messages.push({
                role: 'assistant',
                content: synthesized.content,
                responses: responses,
                synthesized: synthesized,
                timestamp: Date.now()
            });

            saveChatHistory();

        } catch (error) {
            showToast(error.message, 'error');
            console.error('Send message error:', error);
            console.error('Full error details:', {
                message: error.message,
                stack: error.stack,
                selectedModels: state.selectedModels,
                activeModels: activeModels
            });
        } finally {
            state.isLoading = false;
            elements.sendBtn.disabled = false;
            hideLoadingIndicator();
            renderMessages();
            scrollToBottom();
        }
    }

    function showLoadingIndicator() {
        const existing = document.querySelector('.loading-message');
        if (existing) existing.remove();

        const loadingHtml = `
            <div class="message assistant loading-message">
                <div class="message-avatar">🤖</div>
                <div class="message-content">
                    <div class="loading-indicator">
                        <div class="loading-dots">
                            <span></span>
                            <span></span>
                            <span></span>
                        </div>
                        <span class="loading-text">Multiple AIs are thinking...</span>
                    </div>
                </div>
            </div>
        `;

        elements.chatMessages.insertAdjacentHTML('beforeend', loadingHtml);
        scrollToBottom();
    }

    function hideLoadingIndicator() {
        const loading = document.querySelector('.loading-message');
        if (loading) loading.remove();
    }

    function updateStreamingResponse(model, content) {
        // Update streaming display
        const streamingEl = document.querySelector(`.streaming-response[data-model="${model}"]`);
        if (streamingEl) {
            streamingEl.innerHTML = marked.parse(content);
        }
    }

    // ===== Message Rendering =====
    function renderMessages() {
        if (state.messages.length === 0) {
            elements.welcomeScreen.style.display = 'flex';
            elements.chatMessages.innerHTML = '';
            elements.chatMessages.appendChild(elements.welcomeScreen);
            return;
        }

        elements.welcomeScreen.style.display = 'none';

        const html = state.messages.map((msg, index) => {
            if (msg.role === 'user') {
                return renderUserMessage(msg);
            } else {
                return renderAssistantMessage(msg, index);
            }
        }).join('');

        elements.chatMessages.innerHTML = html;
    }

    function renderUserMessage(msg) {
        return `
            <div class="message user">
                <div class="message-avatar">👤</div>
                <div class="message-content">
                    <div class="message-bubble">
                        ${escapeHtml(msg.content)}
                    </div>
                </div>
            </div>
        `;
    }

    function renderAssistantMessage(msg, index) {
        if (state.viewMode === 'split' && msg.responses) {
            return renderSplitView(msg, index);
        }
        return renderUnifiedView(msg, index);
    }

    function renderUnifiedView(msg, index) {
        const synthesized = msg.synthesized || {};
        const modelCount = synthesized.modelCount || 1;
        const disagreements = synthesized.disagreements || [];

        return `
            <div class="message assistant">
                <div class="message-avatar">${synthesized.primaryIcon || '🤖'}</div>
                <div class="message-content">
                    <div class="message-bubble">
                        ${marked.parse(msg.content)}
                    </div>
                    <div class="response-actions">
                        <button class="action-btn" onclick="copyToClipboard(${index})">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                            </svg>
                            Copy
                        </button>
                        ${modelCount > 1 ? `
                            <button class="action-btn" onclick="showResponses(${index})">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                                </svg>
                                Responses ${modelCount}
                            </button>
                        ` : ''}
                        ${disagreements.length > 0 ? `
                            <button class="action-btn warning" onclick="showDisagreements(${index})">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                                    <line x1="12" y1="9" x2="12" y2="13"></line>
                                    <line x1="12" y1="17" x2="12.01" y2="17"></line>
                                </svg>
                                See Disagreements
                            </button>
                        ` : ''}
                    </div>
                </div>
            </div>
        `;
    }

    function renderSplitView(msg, index) {
        const responses = msg.responses || {};
        const activeResponses = Object.entries(responses).filter(([_, r]) => r.success);
        const cols = Math.min(activeResponses.length, 4);

        return `
            <div class="message user" style="margin-bottom: 16px;">
                <div class="message-avatar">👤</div>
                <div class="message-content">
                    <div class="message-bubble">
                        ${escapeHtml(state.messages[index - 1]?.content || '')}
                    </div>
                </div>
            </div>
            <div class="responses-grid cols-${cols}">
                ${activeResponses.map(([model, response]) => `
                    <div class="response-card">
                        <div class="response-card-header ${model}">
                            <span class="model-icon">${response.icon}</span>
                            <span>${response.modelName}</span>
                            ${response.latency ? `<span style="margin-left: auto; font-size: 0.75rem; opacity: 0.7">${response.latency}ms</span>` : ''}
                        </div>
                        <div class="response-card-body">
                            ${marked.parse(response.content || 'No response')}
                        </div>
                    </div>
                `).join('')}
                ${Object.entries(responses).filter(([_, r]) => !r.success).map(([model, response]) => `
                    <div class="response-card">
                        <div class="response-card-header ${model}">
                            <span class="model-icon">${response.icon}</span>
                            <span>${response.modelName}</span>
                        </div>
                        <div class="response-card-body" style="color: var(--error)">
                            ⚠️ ${response.error || 'Failed to respond'}
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    // ===== Global Functions =====
    window.copyToClipboard = async function (index) {
        const msg = state.messages[index];
        if (msg) {
            try {
                await navigator.clipboard.writeText(msg.content);
                showToast('Copied to clipboard!', 'success');
            } catch (err) {
                showToast('Failed to copy', 'error');
            }
        }
    };

    window.showResponses = function (index) {
        const msg = state.messages[index];
        if (msg && msg.responses) {
            // Temporarily switch to split view for this message
            state.viewMode = 'split';
            updateViewButtons();
            renderMessages();

            // Scroll to the response
            const cards = document.querySelectorAll('.responses-grid');
            if (cards.length > 0) {
                cards[cards.length - 1].scrollIntoView({ behavior: 'smooth' });
            }
        }
    };

    window.showDisagreements = function (index) {
        const msg = state.messages[index];
        if (msg && msg.synthesized?.disagreements?.length > 0) {
            const disagreements = msg.synthesized.disagreements;
            const content = disagreements.map(d => {
                const stanceList = Object.entries(d.stances)
                    .map(([model, stance]) => `• ${Synthesizer.models[model]?.name || model}: ${stance}`)
                    .join('\n');
                return `**Topic: "${d.topic}"**\n${stanceList}`;
            }).join('\n\n');

            showToast('Disagreements found on: ' + disagreements.map(d => d.topic).join(', '), 'warning');
        } else {
            showToast('No significant disagreements detected', 'info');
        }
    };

    // ===== Export =====
    function exportJson() {
        const data = {
            chatId: state.currentChatId,
            title: getChatTitle(),
            exportedAt: new Date().toISOString(),
            messages: state.messages
        };

        downloadFile(
            JSON.stringify(data, null, 2),
            `chat-${state.currentChatId}.json`,
            'application/json'
        );

        closeModal('export');
        showToast('Chat exported as JSON', 'success');
    }

    function exportMarkdown() {
        let md = `# ${getChatTitle()}\n\n`;
        md += `*Exported on ${new Date().toLocaleString()}*\n\n---\n\n`;

        state.messages.forEach(msg => {
            if (msg.role === 'user') {
                md += `## 👤 You\n\n${msg.content}\n\n`;
            } else {
                md += `## 🤖 AI Response\n\n${msg.content}\n\n`;

                if (msg.responses) {
                    md += `<details>\n<summary>Individual Model Responses</summary>\n\n`;
                    Object.entries(msg.responses).forEach(([model, response]) => {
                        if (response.success) {
                            md += `### ${response.icon} ${response.modelName}\n\n${response.content}\n\n`;
                        }
                    });
                    md += `</details>\n\n`;
                }
            }
            md += `---\n\n`;
        });

        downloadFile(
            md,
            `chat-${state.currentChatId}.md`,
            'text/markdown'
        );

        closeModal('export');
        showToast('Chat exported as Markdown', 'success');
    }

    function downloadFile(content, filename, type) {
        const blob = new Blob([content], { type });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
    }

    // ===== Modal Management =====
    function openModal(type) {
        const modalMap = {
            settings: elements.settingsModal,
            history: elements.historyModal,
            export: elements.exportModal
        };

        const modal = modalMap[type];
        if (modal) {
            if (type === 'history') {
                renderHistoryList();
            }
            modal.classList.add('active');
        }
    }

    function closeModal(type) {
        const modalMap = {
            settings: elements.settingsModal,
            history: elements.historyModal,
            export: elements.exportModal
        };

        const modal = modalMap[type];
        if (modal) {
            modal.classList.remove('active');
        }
    }

    // ===== Toast Notifications =====
    function showToast(message, type = 'info') {
        const icons = {
            success: '✓',
            error: '✕',
            warning: '⚠',
            info: 'ℹ'
        };

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `
            <span class="toast-icon">${icons[type]}</span>
            <span class="toast-message">${escapeHtml(message)}</span>
        `;

        elements.toastContainer.appendChild(toast);

        setTimeout(() => {
            toast.style.animation = 'toastSlideIn 0.3s ease reverse';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    // ===== Utilities =====
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    function formatDate(timestamp) {
        const date = new Date(timestamp);
        const now = new Date();
        const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));

        if (diffDays === 0) {
            return 'Today ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        } else if (diffDays === 1) {
            return 'Yesterday';
        } else if (diffDays < 7) {
            return date.toLocaleDateString([], { weekday: 'long' });
        } else {
            return date.toLocaleDateString();
        }
    }

    function autoResizeTextarea() {
        const textarea = elements.messageInput;
        textarea.style.height = 'auto';
        textarea.style.height = Math.min(textarea.scrollHeight, 200) + 'px';
    }

    function scrollToBottom() {
        elements.chatMessages.scrollTop = elements.chatMessages.scrollHeight;
    }

    // ===== Event Listeners =====
    function setupEventListeners() {
        // Sidebar
        elements.sidebarToggle.addEventListener('click', () => {
            elements.sidebar.classList.toggle('collapsed');
        });

        elements.mobileMenuBtn.addEventListener('click', () => {
            elements.sidebar.classList.toggle('open');
        });

        elements.newChatBtn.addEventListener('click', newChat);
        elements.historyBtn.addEventListener('click', () => openModal('history'));
        elements.exportBtn.addEventListener('click', () => openModal('export'));
        elements.themeToggle.addEventListener('click', toggleTheme);
        elements.settingsBtn.addEventListener('click', () => openModal('settings'));

        // View toggle
        elements.unifiedViewBtn.addEventListener('click', () => setViewMode('unified'));
        elements.splitViewBtn.addEventListener('click', () => setViewMode('split'));

        // Input
        elements.messageInput.addEventListener('input', () => {
            elements.charCount.textContent = elements.messageInput.value.length;
            autoResizeTextarea();
        });

        elements.messageInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && e.ctrlKey) {
                e.preventDefault();
                sendMessage();
            }
        });

        elements.sendBtn.addEventListener('click', sendMessage);

        // Model selector
        elements.modelSelector.addEventListener('click', (e) => {
            const pill = e.target.closest('.model-pill');
            if (pill) {
                toggleModel(pill.dataset.model);
            }
        });

        // Suggestion cards
        document.querySelectorAll('.suggestion-card').forEach(card => {
            card.addEventListener('click', () => {
                elements.messageInput.value = card.dataset.prompt;
                elements.charCount.textContent = card.dataset.prompt.length;
                autoResizeTextarea();
                elements.messageInput.focus();
            });
        });

        // Settings modal
        document.getElementById('closeSettings').addEventListener('click', () => closeModal('settings'));
        elements.saveSettingsBtn.addEventListener('click', saveSettings);
        elements.clearDataBtn.addEventListener('click', clearAllData);

        // Toggle visibility buttons
        document.querySelectorAll('.toggle-visibility').forEach(btn => {
            btn.addEventListener('click', () => {
                const targetId = btn.dataset.target;
                const input = document.getElementById(targetId);
                const isPassword = input.type === 'password';
                input.type = isPassword ? 'text' : 'password';
                btn.classList.toggle('visible', isPassword);
            });
        });

        // History modal
        document.getElementById('closeHistory').addEventListener('click', () => closeModal('history'));
        elements.historyList.addEventListener('click', (e) => {
            const deleteBtn = e.target.closest('.history-item-delete');
            if (deleteBtn) {
                e.stopPropagation();
                deleteChat(deleteBtn.dataset.chatId);
                return;
            }

            const item = e.target.closest('.history-item');
            if (item) {
                loadChat(item.dataset.chatId);
            }
        });

        // Export modal
        document.getElementById('closeExport').addEventListener('click', () => closeModal('export'));
        elements.exportJson.addEventListener('click', exportJson);
        elements.exportMarkdown.addEventListener('click', exportMarkdown);

        // Close modals on overlay click
        [elements.settingsModal, elements.historyModal, elements.exportModal].forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.classList.remove('active');
                }
            });
        });

        // Close sidebar on mobile when clicking outside
        document.addEventListener('click', (e) => {
            if (window.innerWidth <= 768) {
                if (!elements.sidebar.contains(e.target) && !elements.mobileMenuBtn.contains(e.target)) {
                    elements.sidebar.classList.remove('open');
                }
            }
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            // Escape to close modals
            if (e.key === 'Escape') {
                [elements.settingsModal, elements.historyModal, elements.exportModal].forEach(modal => {
                    modal.classList.remove('active');
                });
            }

            // Ctrl+N for new chat
            if (e.ctrlKey && e.key === 'n') {
                e.preventDefault();
                newChat();
            }
        });
    }

    // ===== Start Application =====
    document.addEventListener('DOMContentLoaded', init);
})();
