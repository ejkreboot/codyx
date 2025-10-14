/**
 * Abstract base class for cell controllers
 * Defines the interface and common functionality for all cell types
 * 
 * Note: Despite the historical "Renderer" naming, these classes handle
 * business logic and state management, not UI rendering.
 * UI rendering is handled by the corresponding Svelte components.
 * 
 * @class CellController
 * @abstract
 * @example
 * // CellController is abstract - extend it to create specific cell types
 * class MyCustomController extends CellController {
 *   constructor(cellId, cellIndex, initialText) {
 *     super(cellId, cellIndex, initialText, 'custom');
 *   }
 *   
 *   async execute() {
 *     return { output: 'Custom execution result' };
 *   }
 *   
 *   render() {
 *     return { component: MyCustomRenderer, props: {} };
 *   }
 * }
 */
export class CellController {
    /**
     * Create a new cell controller
     * @param {string} cellId - Unique identifier for the cell
     * @param {number} cellIndex - Position index of the cell in the notebook
     * @param {string} [initialText=''] - Initial text content of the cell
     * @param {string} [type='unknown'] - Type identifier for the cell (python, markdown, r, etc.)
     * @throws {Error} When trying to instantiate abstract CellController directly
     */
    constructor(cellId, cellIndex, initialText = '', type = 'unknown') {
        if (this.constructor === CellController) {
            throw new Error('CellController is abstract and cannot be instantiated directly');
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
        // Default implementation does nothing
    }
    
    /**
     * Get execution bindings for this cell
     * @returns {Object} Execution bindings
     */
    getExecutionBindings() {
        return {
            execute: () => this.execute(),
            clear: () => this.clear(),
            updateText: (text) => this.updateText(text),
            getText: () => this.text,
            getType: () => this.type,
            getCellId: () => this.cellId,
            getCellIndex: () => this.cellIndex,
            setEditing: (editing) => this.setEditing(editing),
            isEditing: () => this.isEditing,
            isDirty: () => this.isDirty,
        };
    }
    
    // ============ COMMON UTILITY METHODS ============
    
    /**
     * Update text content and mark as dirty
     * @param {string} newText - New text content
     */
    updateText(newText) {
        if (this.text !== newText) {
            this.text = newText;
            this.isDirty = true;
        }
    }
    
    /**
     * Apply user input to collaborative text (single source of truth)
     * @param {string} newText - New text from user input
     */
    applyUserInput(newText) {
        if (this.isCollaborative()) {
            // For collaborative editing: apply directly to Yjs, let it propagate back
            this.getYjsInstance().applyDelta(newText);
        } else {
            // For non-collaborative: update directly
            this.updateText(newText);
        }
    }
    
    /**
     * Set editing state
     * @param {boolean} editing - Whether cell is being edited
     */
    setEditing(editing) {
        console.log('🔄 CellController.setEditing:', { editing, isCollaborative: this.isCollaborative() });
        this.isEditing = editing;
        
        // Update Yjs awareness state if collaborative
        if (this.isCollaborative()) {
            if (editing) {
                console.log('📝 Setting Yjs editing state to true');
                this.getYjsInstance().setEditing(true);
            } else {
                console.log('📝 Clearing Yjs editing state');
                this.getYjsInstance().clearEditing();
            }
        }
    }
    
    /**
     * Mark cell as clean (not dirty)
     */
    markClean() {
        this.isDirty = false;
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
            isEditing: this.isEditing,
            isDirty: this.isDirty,
            textLength: this.text?.length || 0
        };
    }
    

    
    /**
     * Helper method to debounce function calls
     * @param {Function} func - Function to debounce
     * @param {number} wait - Wait time in milliseconds
     * @returns {Function} Debounced function
     */
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
    
    /**
     * Get a unique identifier for this cell
     * @returns {string} Unique cell identifier
     */
    getUniqueId() {
        return `${this.type}-${this.cellId}`;
    }
    
    /**
     * Create a clone of the cell with new ID
     * @param {string} newCellId - New cell ID
     * @param {number} newCellIndex - New cell index
     * @returns {CellController} New cell instance
     */
    clone(newCellId, newCellIndex) {
        const CloneClass = this.constructor;
        return new CloneClass(newCellId, newCellIndex, this.text);
    }
    
    /**
     * Serialize cell to JSON
     * @returns {Object} Serialized cell data
     */
    toJSON() {
        return {
            cellId: this.cellId,
            cellIndex: this.cellIndex,
            type: this.type,
            text: this.text,
            metadata: this.getMetadata()
        };
    }
    
    // ============ COLLABORATIVE FEATURES ============
    
    /**
     * Set the collaborative text instance (LiveText/Yjs)
     * @param {Object} collaborativeText - LiveText or LiveTextYjs instance
     */
    setCollaborativeText(collaborativeText) {
        this.collaborativeText = collaborativeText;
    }
    
    /**
     * Get direct access to Yjs collaborative text instance
     * @returns {YjsCollaborativeText|null} Yjs instance if available
     */
    getYjsInstance() {
        // Direct access to YjsCollaborativeText (no wrapper)
        return this.collaborativeText?.constructor?.name === 'YjsCollaborativeText' 
            ? this.collaborativeText 
            : null;
    }
    
    /**
     * Get cursor positions and selections from other users
     * @returns {Map|null} Awareness states if available
     */
    getCursorPositions() {
        const yjsInstance = this.getYjsInstance();
        return yjsInstance?.getAwarenessStates() || null;
    }
    
    /**
     * Get connection state for collaborative editing
     * @returns {string} Connection state ('connected', 'disconnected', 'connecting')
     */
    getCollaborativeState() {
        return this.collaborativeText?.connectionState || 'disconnected';
    }
    
    /**
     * Check if collaborative features are available
     * @returns {boolean} True if using Yjs collaborative text
     */
    isCollaborative() {
        return !!this.getYjsInstance();
    }
    
    /**
     * Cleanup when controller is destroyed
     */
    onDestroy() {
        // Clean up collaborative text
        this.collaborativeText?.destroy?.();
        this.collaborativeText = null;
        
        // Default implementation - can be overridden by subclasses
        this.isEditing = false;
        this.isDirty = false;
    }
}