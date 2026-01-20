/**
 * Anthropic Claude API Connector
 * Handles communication with Claude models
 * Note: Claude API requires CORS proxy for browser use
 */

const ClaudeAPI = {
    // Use a CORS proxy since Claude API doesn't support browser requests directly
    // In production, you'd want your own backend proxy
    baseUrl: 'https://api.anthropic.com/v1',
    model: 'claude-sonnet-4-20250514',

    /**
     * Get API key from localStorage
     */
    getApiKey() {
        return localStorage.getItem('claude_api_key') || '';
    },

    /**
     * Check if API key is configured
     */
    isConfigured() {
        return this.getApiKey().length > 0;
    },

    /**
     * Convert messages for Claude format (separate system from messages)
     * @param {Array} messages - Standard message format
     * @returns {Object} - { system, messages }
     */
    convertMessages(messages) {
        let system = '';
        const claudeMessages = [];

        for (const msg of messages) {
            if (msg.role === 'system') {
                system = msg.content;
            } else {
                claudeMessages.push({
                    role: msg.role,
                    content: msg.content
                });
            }
        }

        return { system, messages: claudeMessages };
    },

    /**
     * Send a chat completion request
     * Note: Due to CORS, this will likely fail in browser without a proxy
     * @param {Array} messages - Array of message objects {role, content}
     * @param {Object} options - Additional options
     * @returns {Promise<Object>} - Response object
     */
    async chat(messages, options = {}) {
        const apiKey = this.getApiKey();

        if (!apiKey) {
            throw new Error('Claude API key not configured');
        }

        const { system, messages: claudeMessages } = this.convertMessages(messages);

        try {
            const response = await fetch(`${this.baseUrl}/messages`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': apiKey,
                    'anthropic-version': '2023-06-01',
                    'anthropic-dangerous-direct-browser-access': 'true'
                },
                body: JSON.stringify({
                    model: options.model || this.model,
                    max_tokens: options.maxTokens ?? 4096,
                    system: system || undefined,
                    messages: claudeMessages
                })
            });

            if (!response.ok) {
                const error = await response.json().catch(() => ({}));
                throw new Error(error.error?.message || `Claude API error: ${response.status}`);
            }

            const data = await response.json();

            return {
                content: data.content?.[0]?.text || '',
                model: data.model,
                usage: data.usage,
                finishReason: data.stop_reason
            };
        } catch (error) {
            if (error.message.includes('Failed to fetch') || error.message.includes('CORS')) {
                throw new Error('Claude API requires CORS configuration. The request was blocked by the browser. Consider using a backend proxy.');
            }
            throw error;
        }
    },

    /**
     * Stream chat completion with callback
     * @param {Array} messages - Array of message objects
     * @param {Function} onChunk - Callback for each chunk
     * @param {Object} options - Additional options
     */
    async streamChat(messages, onChunk, options = {}) {
        const apiKey = this.getApiKey();

        if (!apiKey) {
            throw new Error('Claude API key not configured');
        }

        const { system, messages: claudeMessages } = this.convertMessages(messages);

        try {
            const response = await fetch(`${this.baseUrl}/messages`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': apiKey,
                    'anthropic-version': '2023-06-01',
                    'anthropic-dangerous-direct-browser-access': 'true'
                },
                body: JSON.stringify({
                    model: options.model || this.model,
                    max_tokens: options.maxTokens ?? 4096,
                    system: system || undefined,
                    messages: claudeMessages,
                    stream: true
                })
            });

            if (!response.ok) {
                const error = await response.json().catch(() => ({}));
                throw new Error(error.error?.message || `Claude API error: ${response.status}`);
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let fullContent = '';

            try {
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;

                    const chunk = decoder.decode(value, { stream: true });
                    const lines = chunk.split('\n').filter(line => line.trim() !== '');

                    for (const line of lines) {
                        if (line.startsWith('data: ')) {
                            const data = line.slice(6);

                            try {
                                const parsed = JSON.parse(data);

                                if (parsed.type === 'content_block_delta') {
                                    const content = parsed.delta?.text || '';
                                    if (content) {
                                        fullContent += content;
                                        onChunk(content, fullContent);
                                    }
                                }
                            } catch (e) {
                                // Skip invalid JSON
                            }
                        }
                    }
                }
            } finally {
                reader.releaseLock();
            }

            return { content: fullContent, model: options.model || this.model };
        } catch (error) {
            if (error.message.includes('Failed to fetch') || error.message.includes('CORS')) {
                throw new Error('Claude API requires CORS configuration. Consider using a backend proxy.');
            }
            throw error;
        }
    }
};

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ClaudeAPI;
}

// Attach to window for browser use (required for Synthesizer to find it)
if (typeof window !== 'undefined') {
    window.ClaudeAPI = ClaudeAPI;
}
