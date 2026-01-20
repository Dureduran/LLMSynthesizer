/**
 * xAI Grok API Connector
 * Handles communication with Grok models
 */

const GrokAPI = {
    baseUrl: 'https://api.x.ai/v1',
    model: 'grok-3-mini-fast-latest',

    /**
     * Get API key from localStorage
     */
    getApiKey() {
        return localStorage.getItem('grok_api_key') || '';
    },

    /**
     * Check if API key is configured
     */
    isConfigured() {
        return this.getApiKey().length > 0;
    },

    /**
     * Send a chat completion request
     * Grok API is OpenAI-compatible
     * @param {Array} messages - Array of message objects {role, content}
     * @param {Object} options - Additional options
     * @returns {Promise<Object>} - Response object
     */
    async chat(messages, options = {}) {
        const apiKey = this.getApiKey();

        if (!apiKey) {
            throw new Error('Grok API key not configured');
        }

        const response = await fetch(`${this.baseUrl}/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: options.model || this.model,
                messages: messages,
                temperature: options.temperature ?? 0.7,
                max_tokens: options.maxTokens ?? 4096,
                stream: options.stream ?? false
            })
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.error?.message || `Grok API error: ${response.status}`);
        }

        if (options.stream) {
            return response.body;
        }

        const data = await response.json();
        return {
            content: data.choices[0]?.message?.content || '',
            model: data.model,
            usage: data.usage,
            finishReason: data.choices[0]?.finish_reason
        };
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
            throw new Error('Grok API key not configured');
        }

        const response = await fetch(`${this.baseUrl}/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: options.model || this.model,
                messages: messages,
                temperature: options.temperature ?? 0.7,
                max_tokens: options.maxTokens ?? 4096,
                stream: true
            })
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.error?.message || `Grok API error: ${response.status}`);
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
                        if (data === '[DONE]') continue;

                        try {
                            const parsed = JSON.parse(data);
                            const content = parsed.choices[0]?.delta?.content || '';
                            if (content) {
                                fullContent += content;
                                onChunk(content, fullContent);
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

        return { content: fullContent, model: this.model };
    }
};

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = GrokAPI;
}

// Attach to window for browser use (required for Synthesizer to find it)
if (typeof window !== 'undefined') {
    window.GrokAPI = GrokAPI;
}
