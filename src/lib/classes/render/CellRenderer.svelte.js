/**
 * Abstract base class for cell renderers
 * Defines the interface and common functionality for all cell types
 */
export class CellRenderer {
    constructor(cellId, cellIndex, initialText = '', type = 'unknown') {
        if (this.constructor === CellRenderer) {
            throw new Error('CellRenderer is abstract and cannot be instantiated directly');
        }
        
        this.type = type;
        this.cellId = cellId;
        this.cellIndex = cellIndex;
        this.text = $state(initialText);
        this.isEditing = $state(false);
        this.isDirty = $state(false);
        
        // Validate required methods are implemented
        this.validateImplementation();
    }
    
    /**
     * Validate that required methods are implemented by subclasses
     */
    validateImplementation() {
        const requiredMethods = ['render', 'execute', 'clear', 'handleInput'];
        const optionalMethods = ['getVariables', 'updateHighlighting', 'onDestroy', 'getExecutionBindings'];
        
        requiredMethods.forEach(method => {
            if (!this[method] || typeof this[method] !== 'function') {
                throw new Error(`${this.constructor.name} must implement ${method}() method`);
            }
        });
        
        const implementedMethods = requiredMethods.concat(optionalMethods);
        console.log(`✅ ${this.constructor.name} validated with methods: ${implementedMethods.join(', ')}`);
    }
    
    // ============ ABSTRACT METHODS ============
    // These must be implemented by subclasses
    
    /**
     * Render the cell content
     * @abstract
     * @returns {Object} Render configuration
     */
    render() {
        throw new Error('render() method must be implemented by subclass');
    }
    
    /**
     * Execute the cell
     * @abstract
     * @returns {Promise<Object>} Execution result
     */
    async execute() {
        throw new Error('execute() method must be implemented by subclass');
    }
    
    /**
     * Clear the cell content
     * @abstract
     */
    clear() {
        throw new Error('clear() method must be implemented by subclass');
    }
    
    /**
     * Handle input events
     * @abstract
     * @param {Event} event - Input event
     */
    handleInput(event) {
        throw new Error('handleInput() method must be implemented by subclass');
    }
    
    // ============ OPTIONAL METHODS ============
    // These have default implementations but can be overridden
    
    /**
     * Get variables defined in current environment
     * @returns {Array} Array of variable objects
     */
    getVariables() {
        return [];
    }
    
    /**
     * Update syntax highlighting
     */
    updateHighlighting() {
        // Default: no highlighting
    }
    
    /**
     * Get execution bindings for this cell
     * @returns {Object} Execution bindings
     */
    getExecutionBindings() {
        return {};
    }
    
    /**
     * Get icon configuration for the cell gutter
     * @returns {Object} Icon configuration
     */
    getIconConfig() {
        // Default fallback - subclasses should override
        return {
            type: 'material-icon',
            icon: 'help_outline',
            color: '#6c757d'
        };
    }
    
    /**
     * Cleanup when cell is destroyed
     */
    onDestroy() {
        // Default implementation does nothing
    }
    
    // ============ UTILITY METHODS ============
    
    /**
     * Update cell text content
     * @param {string} newText - New text content
     */
    updateText(newText) {
        this.text = newText;
        this.isDirty = true;
    }
    
    /**
     * Mark cell as clean (saved)
     */
    markClean() {
        this.isDirty = false;
    }
    
    /**
     * Check if cell has unsaved changes
     * @returns {boolean} True if cell has unsaved changes
     */
    hasUnsavedChanges() {
        return this.isDirty;
    }
    
    /**
     * Get cell metadata
     * @returns {Object} Cell metadata
     */
    getMetadata() {
        return {
            cellId: this.cellId,
            cellIndex: this.cellIndex,
            type: this.type,
            textLength: this.text.length,
            isEditing: this.isEditing,
            isDirty: this.isDirty
        };
    }
    
    /**
     * Set editing state
     * @param {boolean} editing - Whether cell is being edited
     */
    setEditing(editing) {
        this.isEditing = editing;
    }
    
    /**
     * Toggle editing state
     * @returns {boolean} New editing state
     */
    toggleEditing() {
        this.isEditing = !this.isEditing;
        return this.isEditing;
    }
    
    /**
     * Auto-resize textarea element
     * @param {HTMLTextAreaElement} textarea - Textarea element
     */
    autoResizeTextarea(textarea) {
        if (!textarea || !textarea.style) return;
        
        textarea.style.height = 'auto';
        const minHeight = 60; // About 3 lines
        const maxHeight = (this.type === 'r' || this.type === 'code') ? 800 : 400;
        const newHeight = Math.max(minHeight, Math.min(maxHeight, textarea.scrollHeight));
        textarea.style.height = newHeight + 'px';
    }
    
    /**
     * Dispatch event to parent component
     * @param {Function} dispatcher - Event dispatcher function
     * @param {string} eventName - Event name
     * @param {Object} detail - Event detail
     */
    dispatchEvent(dispatcher, eventName, detail = {}) {
        if (typeof dispatcher === 'function') {
            dispatcher(eventName, {
                cellId: this.cellId,
                cellIndex: this.cellIndex,
                ...detail
            });
        }
    }
    
    /**
     * Create debounced function
     * @param {Function} func - Function to debounce
     * @param {number} delay - Delay in milliseconds
     * @returns {Function} Debounced function
     */
    debounce(func, delay) {
        let timeoutId;
        return (...args) => {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => func.apply(this, args), delay);
        };
    }
    
    /**
     * Throttle function calls
     * @param {Function} func - Function to throttle
     * @param {number} delay - Delay in milliseconds
     * @returns {Function} Throttled function
     */
    throttle(func, delay) {
        let lastCall = 0;
        return (...args) => {
            const now = Date.now();
            if (now - lastCall >= delay) {
                lastCall = now;
                return func.apply(this, args);
            }
        };
    }
    
    /**
     * Safe JSON stringify with error handling
     * @param {*} obj - Object to stringify
     * @returns {string} JSON string or error message
     */
    safeStringify(obj) {
        try {
            return JSON.stringify(obj, null, 2);
        } catch (error) {
            return `[Stringify Error: ${error.message}]`;
        }
    }
    
    /**
     * Get cell statistics
     * @returns {Object} Cell statistics
     */
    getStats() {
        return {
            characterCount: this.text.length,
            wordCount: this.text.split(/\s+/).filter(word => word.length > 0).length,
            lineCount: this.text.split('\n').length,
            type: this.type,
            isEditing: this.isEditing,
            isDirty: this.isDirty
        };
    }
}