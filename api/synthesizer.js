/**
 * LLM Synthesizer
 * Handles parallel API calls and response synthesis
 */

const Synthesizer = {
    models: {
        chatgpt: { name: 'ChatGPT', icon: '🤖', api: 'OpenAIAPI', color: '#10a37f' },
        gemini: { name: 'Gemini', icon: '✨', api: 'GeminiAPI', color: '#4285f4' },
        claude: { name: 'Claude', icon: '🧠', api: 'ClaudeAPI', color: '#cc785c' },
        grok: { name: 'Grok', icon: '𝕏', api: 'GrokAPI', color: '#ffffff' }
    },

    /**
     * Get list of configured and selected models
     * @param {Array} selectedModels - Array of model keys to use
     * @returns {Array} - Array of configured model keys
     */
    getActiveModels(selectedModels) {
        return selectedModels.filter(model => {
            const apiName = this.models[model]?.api;
            if (!apiName) return false;

            const api = window[apiName];
            return api && api.isConfigured();
        });
    },

    /**
     * Query a single model
     * @param {string} modelKey - Model key
     * @param {Array} messages - Messages to send
     * @param {Object} options - Additional options
     * @returns {Promise<Object>} - Response with model info
     */
    async queryModel(modelKey, messages, options = {}) {
        const modelInfo = this.models[modelKey];
        if (!modelInfo) {
            throw new Error(`Unknown model: ${modelKey}`);
        }

        const api = window[modelInfo.api];
        if (!api) {
            throw new Error(`API not loaded: ${modelInfo.api}`);
        }

        const startTime = Date.now();

        try {
            const response = await api.chat(messages, options);
            const endTime = Date.now();

            return {
                model: modelKey,
                modelName: modelInfo.name,
                icon: modelInfo.icon,
                color: modelInfo.color,
                content: response.content,
                usage: response.usage,
                latency: endTime - startTime,
                success: true
            };
        } catch (error) {
            return {
                model: modelKey,
                modelName: modelInfo.name,
                icon: modelInfo.icon,
                color: modelInfo.color,
                content: null,
                error: error.message,
                success: false
            };
        }
    },

    /**
     * Query a single model with streaming
     * @param {string} modelKey - Model key
     * @param {Array} messages - Messages to send
     * @param {Function} onChunk - Callback for each chunk
     * @param {Object} options - Additional options
     * @returns {Promise<Object>} - Final response with model info
     */
    async streamModel(modelKey, messages, onChunk, options = {}) {
        const modelInfo = this.models[modelKey];
        if (!modelInfo) {
            throw new Error(`Unknown model: ${modelKey}`);
        }

        const api = window[modelInfo.api];
        if (!api) {
            throw new Error(`API not loaded: ${modelInfo.api}`);
        }

        const startTime = Date.now();

        try {
            const response = await api.streamChat(messages, (chunk, full) => {
                onChunk(modelKey, chunk, full);
            }, options);

            const endTime = Date.now();

            return {
                model: modelKey,
                modelName: modelInfo.name,
                icon: modelInfo.icon,
                color: modelInfo.color,
                content: response.content,
                latency: endTime - startTime,
                success: true
            };
        } catch (error) {
            return {
                model: modelKey,
                modelName: modelInfo.name,
                icon: modelInfo.icon,
                color: modelInfo.color,
                content: null,
                error: error.message,
                success: false
            };
        }
    },

    /**
     * Query multiple models in parallel (non-streaming)
     * @param {Array} selectedModels - Models to query
     * @param {Array} messages - Messages to send
     * @param {Object} options - Additional options
     * @returns {Promise<Object>} - Object with responses keyed by model
     */
    async queryAll(selectedModels, messages, options = {}) {
        const activeModels = this.getActiveModels(selectedModels);

        if (activeModels.length === 0) {
            throw new Error('No models configured. Please add API keys in Settings.');
        }

        const promises = activeModels.map(model =>
            this.queryModel(model, messages, options)
        );

        const results = await Promise.allSettled(promises);

        const responses = {};
        results.forEach((result, index) => {
            const model = activeModels[index];
            if (result.status === 'fulfilled') {
                responses[model] = result.value;
            } else {
                responses[model] = {
                    model: model,
                    modelName: this.models[model].name,
                    icon: this.models[model].icon,
                    color: this.models[model].color,
                    content: null,
                    error: result.reason?.message || 'Unknown error',
                    success: false
                };
            }
        });

        return responses;
    },

    /**
     * Query multiple models in parallel with streaming
     * @param {Array} selectedModels - Models to query
     * @param {Array} messages - Messages to send
     * @param {Function} onChunk - Callback for each chunk (modelKey, chunk, fullContent)
     * @param {Function} onComplete - Callback when a model completes
     * @param {Object} options - Additional options
     * @returns {Promise<Object>} - Object with final responses
     */
    async streamAll(selectedModels, messages, onChunk, onComplete, options = {}) {
        const activeModels = this.getActiveModels(selectedModels);

        if (activeModels.length === 0) {
            throw new Error('No models configured. Please add API keys in Settings.');
        }

        const promises = activeModels.map(async model => {
            const result = await this.streamModel(model, messages, onChunk, options);
            if (onComplete) onComplete(model, result);
            return result;
        });

        const results = await Promise.allSettled(promises);

        const responses = {};
        results.forEach((result, index) => {
            const model = activeModels[index];
            if (result.status === 'fulfilled') {
                responses[model] = result.value;
            } else {
                responses[model] = {
                    model: model,
                    modelName: this.models[model].name,
                    icon: this.models[model].icon,
                    color: this.models[model].color,
                    content: null,
                    error: result.reason?.message || 'Unknown error',
                    success: false
                };
            }
        });

        return responses;
    },

    /**
     * Find disagreements between model responses
     * This is a simplified version - could be enhanced with NLP
     * @param {Object} responses - Responses keyed by model
     * @returns {Array} - Array of disagreement objects
     */
    findDisagreements(responses) {
        const disagreements = [];
        const successfulResponses = Object.entries(responses)
            .filter(([_, r]) => r.success && r.content);

        if (successfulResponses.length < 2) {
            return disagreements;
        }

        // Extract key statements/claims from responses
        // This is a basic implementation - could use semantic similarity
        const extractStatements = (content) => {
            return content
                .split(/[.!?]+/)
                .map(s => s.trim().toLowerCase())
                .filter(s => s.length > 20); // Only meaningful statements
        };

        // Compare responses for contradictions
        // Look for negation patterns
        const negationPatterns = [
            { positive: /\bis\b/, negative: /\bis not\b|\bisn't\b/ },
            { positive: /\bcan\b/, negative: /\bcannot\b|\bcan't\b/ },
            { positive: /\bwill\b/, negative: /\bwill not\b|\bwon't\b/ },
            { positive: /\bshould\b/, negative: /\bshould not\b|\bshouldn't\b/ },
            { positive: /\bdoes\b/, negative: /\bdoes not\b|\bdoesn't\b/ }
        ];

        // Simple sentiment/stance detection on key topics
        const topics = new Set();
        successfulResponses.forEach(([_, response]) => {
            const words = response.content.toLowerCase().match(/\b[a-z]{4,}\b/g) || [];
            words.forEach(w => topics.add(w));
        });

        // Check for opposing stances
        const stanceIndicators = {
            positive: ['better', 'best', 'good', 'excellent', 'recommend', 'prefer', 'advantage'],
            negative: ['worse', 'worst', 'bad', 'avoid', 'disadvantage', 'problem', 'issue']
        };

        // Find topics where models have different stances
        const getStance = (content, topic) => {
            const context = content.toLowerCase();
            const topicIndex = context.indexOf(topic);
            if (topicIndex === -1) return null;

            // Get surrounding context
            const start = Math.max(0, topicIndex - 100);
            const end = Math.min(context.length, topicIndex + 100);
            const surrounding = context.slice(start, end);

            const posScore = stanceIndicators.positive.filter(w => surrounding.includes(w)).length;
            const negScore = stanceIndicators.negative.filter(w => surrounding.includes(w)).length;

            if (posScore > negScore) return 'positive';
            if (negScore > posScore) return 'negative';
            return 'neutral';
        };

        // Compare stances across models for common topics
        topics.forEach(topic => {
            const stances = {};
            successfulResponses.forEach(([model, response]) => {
                const stance = getStance(response.content, topic);
                if (stance && stance !== 'neutral') {
                    stances[model] = stance;
                }
            });

            const stanceValues = Object.values(stances);
            if (stanceValues.includes('positive') && stanceValues.includes('negative')) {
                disagreements.push({
                    topic: topic,
                    models: Object.keys(stances),
                    stances: stances,
                    type: 'stance'
                });
            }
        });

        return disagreements.slice(0, 5); // Limit to top 5 disagreements
    },

    /**
     * Get a synthesized/unified response from multiple model responses
     * Uses the first successful response as primary
     * @param {Object} responses - Responses keyed by model
     * @returns {Object} - Synthesized response info
     */
    synthesize(responses) {
        const successful = Object.entries(responses)
            .filter(([_, r]) => r.success && r.content)
            .sort((a, b) => a[1].latency - b[1].latency); // Fastest first

        if (successful.length === 0) {
            return {
                content: 'All models failed to respond. Please check your API keys and try again.',
                primaryModel: null,
                modelCount: 0,
                disagreements: []
            };
        }

        const [primaryModel, primaryResponse] = successful[0];
        const disagreements = this.findDisagreements(responses);

        return {
            content: primaryResponse.content,
            primaryModel: primaryModel,
            primaryModelName: primaryResponse.modelName,
            primaryIcon: primaryResponse.icon,
            modelCount: successful.length,
            disagreements: disagreements,
            allResponses: responses
        };
    }
};

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Synthesizer;
}

// Attach to window for browser use
if (typeof window !== 'undefined') {
    window.Synthesizer = Synthesizer;
}
