import { CellController } from './CellController.svelte.js';
import RCellRenderer from '$lib/components/renderers/RCellRenderer.svelte';
import webRService from '$lib/classes/webr-service.js';

/**
 * R Cell Controller - Manages R statistical computing code execution
 * 
 * Handles R code execution using WebR, manages R packages, and provides
 * statistical computing capabilities directly in the browser.
 * 
 * @class RCellController
 * @extends CellController
 * @example
 * // Create a new R cell controller
 * const controller = new RCellController('cell-1', 0, 'data <- c(1,2,3,4,5)\nmean(data)');
 * 
 * // Execute R code
 * const result = await controller.execute();
 * console.log(result.output); // R execution output
 * 
 * // Install R packages
 * await controller.installPackages(['ggplot2', 'dplyr']);
 */
export class RCellController extends CellController {
    /**
     * Create a new R cell controller
     * @param {string} cellId - Unique identifier for the cell
     * @param {number} cellIndex - Position index of the cell in the notebook
     * @param {string} [initialText=''] - Initial R code content
     */
    constructor(cellId, cellIndex, initialText = '') {
        super(cellId, cellIndex, initialText, 'r');
        this.output = $state(null);
        this.isExecuting = $state(false);
        this.packages = $state([]);
    }

    /**
     * Render the R cell - returns Svelte component instance
     * @returns {Object} Render configuration with component and props
     */
    render(callbacks = {}) {
        return {
            component: RCellRenderer,
            props: {
                controller: this, // Updated from 'renderer' to 'controller'
                ...callbacks
            }
        };
    }

    /**
     * Execute R code using WebR service
     * @returns {Promise<Object>} Execution result
     */
    async execute() {
        if (!this.text.trim()) {
            return { success: false, error: 'No R code to execute' };
        }

        this.isExecuting = true;
        this.output = null;

        try {
            // Check WebR service status
            const status = webRService.getStatus();
            if (status === 'error') {
                throw new Error('WebR service failed to initialize. Please refresh the page and try again.');
            }

            const result = await webRService.executeCode(this.text);
            
            if (result.error) {
                this.output = {
                    type: 'error',
                    content: result.error
                };
                this.isExecuting = false;
                return { success: false, error: result.error };
            }

            // Handle different output types - support both plots and text
            const hasPlots = result.plots && result.plots.length > 0;
            const hasText = result.output && result.output.trim();
            
            if (hasPlots && hasText) {
                // Both plots and text output
                this.output = {
                    type: 'mixed',
                    textContent: result.output,
                    plots: result.plots
                };
            } else if (hasPlots) {
                // Only plots
                this.output = {
                    type: 'plot',
                    content: result.plots[0], // Show first plot for backward compatibility
                    plots: result.plots // Keep all plots available
                };
            } else if (hasText) {
                // Only text output
                this.output = {
                    type: 'text',
                    content: result.output
                };
            } else {
                // No visible output
                this.output = {
                    type: 'text',
                    content: '(No output)'
                };
            }
            
            this.isExecuting = false;
            return { success: true, output: this.output };
            
        } catch (error) {
            this.output = {
                type: 'error',
                content: error.message || String(error)
            };
            this.isExecuting = false;
            return { success: false, error: error.message || String(error) };
        }
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
     * Clear cell content and reset state
     */
    clear() {
        this.text = '';
        this.output = null;
        this.isExecuting = false;
    }

    /**
     * Handle input events
     * @param {Event} event - Input event
     */
    handleInput(event) {
        this.text = event.target.value;
    }

    /**
     * Get icon configuration for R cells
     * @returns {Object} Icon configuration
     */
    getIconConfig() {
        return {
            type: 'custom-symbol',
            icon: 'r-symbol',
            color: '#054ba4'
        };
    }

    /**
     * Get variables from R environment
     * @returns {Promise<Array<string>>} Array of R variable names
     */
    async getVariables() {
        const var_text = await webRService.executeCode('ls()');
        if(var_text?.output.includes("character(0)")) {
            return [];
        }
        const vars = var_text.output.replace(/\[1\]\s*/, '')
                             .split(/"\s+"/)
                             .map(c => c.replace(/"/g,""));
        return vars;
    }

    /**
     * Update highlighting (R syntax highlighting not implemented yet)
     */
    updateHighlighting() {
        // TODO: Implement R syntax highlighting
    }

    /**
     * Get execution bindings for R
     * @returns {Object} R execution bindings
     */
    getExecutionBindings() {
        return {
            language: 'r',
            executeCommand: 'Rscript',
            packages: this.packages
        };
    }

    /**
     * Cleanup resources
     */
    onDestroy() {
        this.isExecuting = false;
        this.output = null;
        
        // Call parent cleanup
        super.onDestroy();
    }
}