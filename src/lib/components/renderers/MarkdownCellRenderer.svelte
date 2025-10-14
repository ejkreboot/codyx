<script>
    import { processEnhancedMarkdown } from '$lib/util/enhanced-markdown.js';

    let {
        controller,
        textareaElement = $bindable(),
        onInput,
        onStartEditing,
        onStopEditing,
        onKeydown
    } = $props();

    function handleInput(event) {
        // Auto-resize the textarea
        autoResizeTextarea(event.target);
        // Call the parent's onInput if it exists
        if (onInput) {
            onInput(event);
        }
    }

    /**
     * Auto-resize textarea based on content
     * @param {HTMLElement} textarea - Textarea element to resize
     */
    function autoResizeTextarea(textarea) {
        if (!textarea || !textarea.style) return;
        
        // Reset height to auto to get the correct scrollHeight
        textarea.style.height = 'auto';
        
        // Set height based on scroll height with some padding
        const newHeight = Math.max(textarea.scrollHeight + 4, 80); // 80px minimum
        textarea.style.height = newHeight + 'px';
        
        // Ensure max height constraint
        const maxHeight = 800;
        if (newHeight > maxHeight) {
            textarea.style.height = maxHeight + 'px';
            textarea.style.overflowY = 'scroll';
        } else {
            textarea.style.overflowY = 'hidden';
        }
    }
</script>

{#if controller.isEditing}
    <textarea 
        bind:this={textareaElement}
        bind:value={controller.text} 
        oninput={handleInput}
        onblur={() => onStopEditing?.()}
        class="cell-textarea"
        placeholder="Enter markdown..."
    ></textarea>
    <div class="markdown-preview">
        <div class="rendered-markdown">
            {@html processEnhancedMarkdown(controller.text)}
        </div>
    </div>
{:else}
    <div 
        class="rendered-markdown" 
        onclick={() => onStartEditing?.()} 
        onkeydown={(e) => onKeydown?.(e)} 
        role="button" 
        tabindex="0"
    >
        {@html processEnhancedMarkdown(controller.text)}
    </div>
{/if}

<style>
    .cell-textarea {
        width: 100%;
        min-height: 60px;
        max-height: 800px;
        padding: 1rem;
        border: none;
        outline: none;
        resize: none;
        overflow-y: auto;
        font-family: 'Cutive Mono', monospace;
        font-size: 14px;
        line-height: 1.5;
        color: #555958;
        background: transparent;
        box-sizing: border-box;
        transition: height 0.1s ease;
    }

    .markdown-preview {
        margin-top: 8px;
        padding: 12px;
        background: #fafbfc;
        border-radius: 4px;
        border: 1px solid #e9ecef;
    }

    .markdown-preview .rendered-markdown {
        cursor: default;
        padding: 0;
        margin: 0;
    }

    .rendered-markdown {
        cursor: pointer;
        padding: 1rem;
        font-family: 'Raleway', sans-serif;
        font-size: 16px;
        line-height: 1.6;
        color: #555958;
        background: transparent;
        border: none;
        min-height: 120px;
        box-sizing: border-box;
    }

    .rendered-markdown:hover {
        background-color: rgba(0, 149, 242, 0.05);
    }

    .rendered-markdown:focus {
        outline: none;
        box-shadow: inset 0 0 0 2px #0095f2;
    }

    .rendered-markdown :global(h1),
    .rendered-markdown :global(h2),
    .rendered-markdown :global(h3),
    .rendered-markdown :global(h4),
    .rendered-markdown :global(h5),
    .rendered-markdown :global(h6) {
        color: #555958;
        font-weight: 600;
        margin-top: 0.5em;
        margin-bottom: 0.5em;
    }

    .rendered-markdown :global(h1) {
        font-size: 2em;
        border-bottom: 2px solid #0095f2;
        padding-bottom: 0.3em;
    }

    .rendered-markdown :global(h2) {
        font-size: 1.5em;
    }

    .rendered-markdown :global(code) {
        background-color: rgba(255, 160, 0, 0.1);
        padding: 0.2em 0.4em;
        border-radius: 4px;
        font-family: 'Cutive Mono', monospace;
        font-size: 0.9em;
    }

    .rendered-markdown :global(pre) {
        background-color: rgba(85, 89, 88, 0.05);
        padding: 1em;
        border-radius: 6px;
        border-left: 4px solid #0095f2;
        overflow-x: auto;
    }

    .rendered-markdown :global(pre code) {
        background: transparent;
        padding: 0;
    }

    .rendered-markdown :global(blockquote) {
        border-left: 4px solid #ffa000;
        margin: 1em 0;
        padding: 0.5em 1em;
        background-color: rgba(255, 160, 0, 0.05);
        font-style: italic;
    }

    .rendered-markdown :global(a) {
        color: #0095f2;
        text-decoration: none;
    }

    .rendered-markdown :global(a:hover) {
        text-decoration: underline;
    }

    /* Collapsible Section Styles */
    .rendered-markdown :global(.collapsible-section) {
        margin: 1rem 0;
        border: 1px solid #e9ecef;
        border-radius: 8px;
        overflow: hidden;
        background: white;
    }

    .rendered-markdown :global(.collapsible-header) {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.75rem 1rem;
        background: #f8f9fa;
        cursor: pointer;
        user-select: none;
        transition: background-color 0.2s ease;
        border-bottom: 1px solid #e9ecef;
    }

    .rendered-markdown :global(.collapsible-header:hover) {
        background: #e9ecef;
    }

    .rendered-markdown :global(.collapsible-icon) {
        font-size: 18px;
        color: var(--color-accent-1);
        transition: transform 0.2s ease;
        flex-shrink: 0;
    }

    .rendered-markdown :global(.collapsible-title) {
        margin: 0;
        font-weight: 600;
        font-family: 'Raleway', sans-serif;
        color: #333;
        flex: 1;
    }

    .rendered-markdown :global(.collapsible-content) {
        padding: 1rem;
        background: white;
        animation: slideDown 0.2s ease-out;
    }

    @keyframes slideDown {
        from {
            opacity: 0;
            max-height: 0;
        }
        to {
            opacity: 1;
            max-height: 1000px;
        }
    }

    /* KaTeX Math Styling */
    .rendered-markdown :global(.katex) {
        font-size: 1em;
    }

    .rendered-markdown :global(.katex-display) {
        margin: 1em 0;
        text-align: center;
    }

    .rendered-markdown :global(.math-error) {
        color: #cc0000;
        background: #ffe6e6;
        padding: 2px 4px;
        border-radius: 3px;
        font-family: 'Cutive Mono', monospace;
        font-size: 0.9em;
        border: 1px solid #ffcccc;
    }
</style>