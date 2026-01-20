/**
 * Google Gemini API Connector
 * Handles communication with Gemini models
 */

const GeminiAPI = {
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
    model: 'gemini-2.0-flash',

    /**
     * Get API key from localStorage
     */
    getApiKey() {
        return localStorage.getItem('gemini_api_key') || '';
    },

    /**
     * Check if API key is configured
     */
    isConfigured() {
        return this.getApiKey().length > 0;
    },

    /**
     * Convert messages to Gemini format
     * @param {Array} messages - Standard message format
     * @returns {Array} - Gemini format messages
     */
    convertMessages(messages) {
        const contents = [];

        for (const msg of messages) {
            if (msg.role === 'system') {
                // Gemini handles system prompts differently
                contents.push({
                    role: 'user',
                    parts: [{ text: `System: ${msg.content}` }]
                });
                contents.push({
                    role: 'model',
                    parts: [{ text: 'Understood. I will follow these instructions.' }]
                });
            } else {
                contents.push({
                    role: msg.role === 'assistant' ? 'model' : 'user',
                    parts: [{ text: msg.content }]
                });
            }
        }

        return contents;
    },

    /**
     * Send a chat completion request
     * @param {Array} messages - Array of message objects {role, content}
     * @param {Object} options - Additional options
     * @returns {Promise<Object>} - Response object
     */
    async chat(messages, options = {}) {
        const apiKey = this.getApiKey();

        if (!apiKey) {
            throw new Error('Gemini API key not configured');
        }

        const model = options.model || this.model;
        const contents = this.convertMessages(messages);

        const response = await fetch(
            `${this.baseUrl}/models/${model}:generateContent?key=${apiKey}`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    contents: contents,
                    generationConfig: {
                        temperature: options.temperature ?? 0.7,
                        maxOutputTokens: options.maxTokens ?? 4096,
                        topP: options.topP ?? 0.95
                    },
                    safetySettings: [
                        { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
                        { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
                        { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
                        { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' }
                    ]
                })
            }
        );

        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.error?.message || `Gemini API error: ${response.status}`);
        }

        const data = await response.json();

        if (data.candidates && data.candidates[0]) {
            return {
                content: data.candidates[0].content?.parts?.[0]?.text || '',
                model: model,
                usage: data.usageMetadata,
                finishReason: data.candidates[0].finishReason
            };
        }

        throw new Error('No response from Gemini');
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
            throw new Error('Gemini API key not configured');
        }

        const model = options.model || this.model;
        const contents = this.convertMessages(messages);

        const response = await fetch(
            `${this.baseUrl}/models/${model}:streamGenerateContent?key=${apiKey}&alt=sse`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    contents: contents,
                    generationConfig: {
                        temperature: options.temperature ?? 0.7,
                        maxOutputTokens: options.maxTokens ?? 4096
                    }
                })
            }
        );

        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.error?.message || `Gemini API error: ${response.status}`);
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
                            const content = parsed.candidates?.[0]?.content?.parts?.[0]?.text || '';
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

        return { content: fullContent, model: model };
    }
};

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = GeminiAPI;
}

// Attach to window for browser use (required for Synthesizer to find it)
if (typeof window !== 'undefined') {
    window.GeminiAPI = GeminiAPI;
}
