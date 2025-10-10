import { CellController } from './CellController.svelte.js';
import MarkdownCellRenderer from '$lib/components/renderers/MarkdownCellRenderer.svelte';

/**
 * Markdown Cell Controller - Manages rich text formatting and documentation
 * 
 * Handles markdown text rendering with edit/preview modes, supports enhanced
 * markdown features, and provides seamless integration for documentation cells.
 * 
 * @class MarkdownCellController
 * @extends CellController
 * @example
 * // Create a new markdown cell controller
 * const controller = new MarkdownCellController('cell-1', 0, '# Hello World\n\nThis is **bold** text.');
 * 
 * // Toggle preview mode
 * controller.togglePreview();
 * console.log(controller.isPreviewMode); // true
 * 
 * // Execute (render) markdown
 * const result = await controller.execute();
 * console.log(result.output); // Rendered HTML
 */
export class MarkdownCellController extends CellController {
    /**
     * Create a new markdown cell controller
     * @param {string} cellId - Unique identifier for the cell
     * @param {number} cellIndex - Position index of the cell in the notebook
     * @param {string} [initialText=''] - Initial markdown content
     */
    constructor(cellId, cellIndex, initialText = '') {
        super(cellId, cellIndex, initialText, 'markdown');
        this.isPreviewMode = $state(false);
        // isEditing is now inherited from CellController base class
    }

    /**
     * Render the markdown cell - returns Svelte component instance
     * @returns {Object} Render configuration with component and props
     */
    render(callbacks = {}) {
        return {
            component: MarkdownCellRenderer,
            props: {
                controller: this, // Updated from 'renderer' to 'controller'
                ...callbacks
            }
        };
    }

    /**
     * Execute cell - toggles preview mode for markdown
     * @returns {Promise<Object>} Execution result
     */
    async execute() {
        this.isPreviewMode = !this.isPreviewMode;
        return {
            success: true,
            output: null,
            isPreviewMode: this.isPreviewMode
        };
    }

    /**
     * Clear cell content and reset state
     */
    clear() {
        this.text = '';
        this.isPreviewMode = false;
        this.isEditing = false;
    }

    /**
     * Handle input events
     * @param {Event} event - Input event
     */
    handleInput(event) {
        this.text = event.target.value;
    }

    /**
     * Start editing mode
     */
    startEditing() {
        this.isEditing = true;
    }

    /**
     * Stop editing mode  
     */
    stopEditing() {
        this.isEditing = false;
    }

    /**
     * Get icon configuration for markdown cells
     * @returns {Object} Icon configuration
     */
    getIconConfig() {
        return {
            type: 'material-icon',
            icon: 'markdown',
            color: 'var(--color-accent-2)'
        };
    }

    /**
     * Get variables (markdown cells don't have variables)
     * @returns {Array} Empty array
     */
    getVariables() {
        return [];
    }

    /**
     * Update highlighting (no-op for markdown)
     */
    updateHighlighting() {
        // Markdown cells don't have syntax highlighting
    }

    /**
     * Get execution bindings (no-op for markdown)
     * @returns {Object} Empty object
     */
    getExecutionBindings() {
        return {};
    }

    /**
     * Cleanup resources
     */
    onDestroy() {
        // No special cleanup needed for markdown
        
        // Call parent cleanup
        super.onDestroy();
    }
}