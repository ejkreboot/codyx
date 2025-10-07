import { CellRenderer } from './CellRenderer.svelte.js';
import MarkdownCellRenderer from '$lib/components/renderers/MarkdownCellRenderer.svelte';

/**
 * Markdown-specific renderer with edit/preview modes
 */
export class MarkdownRenderer extends CellRenderer {
    constructor(cellId, cellIndex, initialText = '') {
        super(cellId, cellIndex, initialText, 'markdown');
        this.isPreviewMode = $state(false);
        // isEditing is now inherited from CellRenderer base class
    }

    /**
     * Render the markdown cell - returns Svelte component instance
     * @returns {Object} Render configuration with component and props
     */
    render() {
        return {
            component: MarkdownCellRenderer,
            props: {
                renderer: this
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
        this.autoResizeTextarea(event.target);
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
     * Update text content
     */
    updateText(newText) {
        this.text = newText;
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
    }
}