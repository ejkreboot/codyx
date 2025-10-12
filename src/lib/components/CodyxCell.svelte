<script>
    import { onMount, onDestroy, createEventDispatcher } from 'svelte';
    import { LiveText } from '$lib/classes/live-text.js';
    import { supabase } from '$lib/util/supabase-client.js';
    import { collapsibleScript } from '$lib/util/enhanced-markdown.js';
    import { MarkdownCellController } from '$lib/classes/cells/MarkdownCellController.svelte.js';
    import { RCellController } from '$lib/classes/cells/RCellController.svelte.js';
    import { PythonCellController } from '$lib/classes/cells/PythonCellController.svelte.js';

    // Props
    let props = $props();
    let initialText = props.initialText ?? '';
    let type = props.type ?? 'md';
    let docId = props.docId ?? crypto.randomUUID();
    let userId = props.userId ?? null;
    let version = props.version;
    let cellIndex = props.cellIndex ?? 1;
    let sandboxed = props.sandboxed ?? false;

    // Container state
    let typing = $state(false);
    let connectionState = $state('disconnected'); // 'connecting', 'connected', 'disconnected'
    let liveText;
    let codeEditor = $state();
    
    // Controller instance
    let controller = $state(null);
    
    // Event dispatcher
    const dispatch = createEventDispatcher();
    
    // LiveText updater function
    let liveTextUpdater = null;
    
    // Event handler functions for proper cleanup
    let handlePatched, handleTyping, handleConnectionChange;

    // ============ CONTROLLER MANAGEMENT ============
    
    /**
     * Create appropriate controller based on cell type
     */
    function createController() {
        if (type === 'md') {
            controller = new MarkdownCellController(docId, cellIndex, initialText);
        } else if (type === 'code') {
            controller = new PythonCellController(docId, cellIndex, initialText);
        } else if (type === 'r') {
            controller = new RCellController(docId, cellIndex, initialText);
        } else {
            controller = null;
        }
    }
    
    /**
     * Handle text changes from controller or direct input
     */
    function handleTextChange(newText) {
        if (controller) {
            controller.updateText(newText);
        }
        
        if (liveTextUpdater) {
            liveTextUpdater({ target: { value: newText } });
        }
    }
    
    /**
     * Handle input events from textarea
     */
    function handleInput(event) {
        handleTextChange(event.target.value);
    }

    // ============ CELL ACTIONS ============
    
    function startEditing() {
        if (sandboxed) return;
        controller?.startEditing();
    }

    function stopEditing() {
        if (sandboxed) return;
        controller?.stopEditing();
        dispatch('edit', { type: "edit", docId, text: controller?.text });
    }

    async function executeCell() {
        if (controller) {
            try {
                const result = await controller.execute();
                dispatch('execute', { cellId: docId, result });
            } catch (error) {
                console.error('Cell execution failed:', error);
            }
        }
    }

    function clearCell() {
        if (controller) {
            controller.clear();
        }
    }

    // ============ TOOLBAR ACTIONS ============
    
    function moveUp() {
        dispatch('moveUp', { docId });
    }

    function moveDown() {
        dispatch('moveDown', { docId });
    }

    function deleteCell() {
        dispatch('delete', { docId });
    }

    function addMarkdownCell() {
        dispatch('addCell', { docId, cellType: 'md' });
    }

    function addCodeCell() {
        dispatch('addCell', { docId, cellType: 'code' });
    }

    function addRCell() {
        dispatch('addCell', { docId, cellType: 'r' });
    }

    function handleKeydown(event) {
        if (event.key === 'Enter') {
            startEditing();
        }
    }

    // ============ LIFECYCLE ============

    onMount(async () => {
        // Create controller instance
        createController();
        
        // Set up LiveText
        liveText = await LiveText.create({
            text: initialText, 
            docId, 
            supabase, 
            userId, 
            version
        });
        
        // Define event handlers in module scope for proper cleanup
        handlePatched = (e) => {
            if (controller) {
                controller.updateText(e.detail.text);
            }
        };
        
        handleTyping = (e) => {
            typing = e.detail.typing;
        };

        handleConnectionChange = (e) => {
            connectionState = e.detail.state;
            
            // Propagate connection state to notebook level
            if (!sandboxed) {
                window.dispatchEvent(new CustomEvent('cellConnectionStateChange', {
                    detail: {
                        cellId: docId,
                        connectionState: e.detail.state
                    }
                }));
            }
        };
        
        liveText.addEventListener('patched', handlePatched);
        liveText.addEventListener('typing', handleTyping);
        liveText.addEventListener('connectionchange', handleConnectionChange);
        
        // Initialize connection state from LiveText
        connectionState = liveText.connectionState;

        if (!sandboxed) {
            liveTextUpdater = (e) => {
                liveText.update(e.target.value);
            };
        }

        // Inject collapsible functionality for markdown
        if (!window.toggleCollapsible) {
            const script = document.createElement('script');
            script.textContent = collapsibleScript;
            document.head.appendChild(script);
        }

    });

    // Auto-resize is now handled within each renderer component

    onDestroy(() => {
        if (sandboxed) return;
        
        liveText?.removeEventListener('patched', handlePatched);
        liveText?.removeEventListener('typing', handleTyping);
        liveText?.removeEventListener('connectionchange', handleConnectionChange);
        liveText?.destroy();
        
        // Cleanup controller
        controller?.onDestroy();
    });
</script>

<div class="cell-container" data-cell-type={type}>
    <!-- Cell Gutter -->
    <div class="cell-gutter">
        <div class="cell-type-icon">
            {#if controller}
                {@const iconConfig = controller.getIconConfig()}
                {#if iconConfig.type === 'material-icon'}
                    <span class="material-symbols-outlined" style="color: {iconConfig.color}">
                        {iconConfig.icon}
                    </span>
                {:else if iconConfig.type === 'custom-symbol'}
                    <span class="{iconConfig.icon}" style="color: {iconConfig.color}"></span>
                {/if}
            {:else}
                <!-- Fallback for when controller isn't ready -->
                <span class="material-symbols-outlined" style="color: #6c757d">help_outline</span>
            {/if}
        </div>
        <div class="cell-index"
             class:connected={connectionState === 'connected' && !sandboxed}
             class:disconnected={(connectionState === 'disconnected' || connectionState === 'connecting') && !sandboxed}
             title={!sandboxed ? `Real-time collaboration: ${connectionState}` : ''}>
            [{cellIndex}]
        </div>
    </div>
  
    <!-- Cell Content -->
    <div class="cell-content">
        <!-- Toolbar -->
        {#if !sandboxed}
        <div class="toolbar">
            <button class="toolbar-btn" onclick={moveUp} title="Move Up">
                <span class="material-symbols-outlined">keyboard_arrow_up</span>
            </button>
            <button class="toolbar-btn" onclick={moveDown} title="Move Down">
                <span class="material-symbols-outlined">keyboard_arrow_down</span>
            </button>
            <button class="toolbar-btn" onclick={addMarkdownCell} title="Add Markdown Cell">
                <span class="material-symbols-outlined">markdown</span>
            </button>
            <button class="toolbar-btn" onclick={addCodeCell} title="Add Python Cell">
                <span class="python-symbol"></span>
            </button>
            <button class="toolbar-btn" onclick={addRCell} title="Add R Cell">
                <span class="r-symbol"></span>
            </button>
            <button class="toolbar-btn delete-btn" onclick={deleteCell} title="Delete Cell">
                <span class="material-symbols-outlined">delete</span>
            </button>
        </div>
        {/if}

        <!-- Universal Cell Rendering -->
        {#if controller}
            {@const renderConfig = controller.render({
                onInput: handleInput,
                onStartEditing: startEditing,
                onStopEditing: stopEditing,
                onKeydown: handleKeydown
            })}
            <renderConfig.component 
                {...renderConfig.props}
                bind:codeEditor
            />
        {:else}
            <div class="temp-fallback">
                <p>🚧 Controller for type "{type}" not implemented yet!</p>
            </div>
        {/if}
    
        <!-- Typing indicator -->
        {#if typing}
            <div class="typing-indicator" aria-live="polite">Typing…</div>
        {/if}
    </div>
</div>

<style>
    @import url('https://fonts.googleapis.com/css2?family=Raleway:ital,wght@0,300;0,400;0,500;0,600;1,400&family=Cutive+Mono&display=swap');
    @import url('https://fonts.googleapis.com/icon?family=Material+Symbols+Outlined');

    :root {
        --color-accent-1: #ffa000;
        --color-accent-2: #0095f2;
    }

    .cell-container {
        margin-bottom: 0.5rem;
        border: 0.5px solid rgb(230, 230, 230);
        overflow: hidden;
        background: white;
        width: 100%;
        box-sizing: border-box;
        position: relative;
        display: flex;
    }

    .cell-gutter {
        width: 36px;
        background: #ffffff;
        border-right: 0px solid #e9ecef;
        display: flex;
        flex-direction: column;
        align-items: center;
        padding: 8px 4px;
        gap: 6px;
        flex-shrink: 0;
    }

    .cell-type-icon {
        display: flex;
        align-items: center;
        justify-content: center;
    }

    .cell-type-icon .material-symbols-outlined {
        font-size: 18px;
    }

    /* Size adjustments for custom symbols */
    .r-symbol,
    .python-symbol {
        font-size: 14px;
    }

    .cell-index {
        font-family: 'Cutive Mono', monospace;
        font-size: 11px;
        color: #888;
        font-weight: 600;
        text-align: center;
        line-height: 1;
        transition: color 0.2s ease;
        cursor: default;
    }

    .cell-index.disconnected {
        color: #dc3545;
    }

    .cell-index.connected {
        color: #888;
    }

    .cell-content {
        flex: 1;
        position: relative;
        min-height: 60px;
    }

    .toolbar {
        position: absolute;
        top: 8px;
        right: 8px;
        display: flex;
        gap: 4px;
        z-index: 10;
        opacity: 0;
        transition: opacity 0.2s ease;
        background: rgba(255, 255, 255, 0.95);
        border-radius: 6px;
        padding: 4px;
        box-shadow: 0 2px 8px rgba(85, 89, 88, 0.15);
    }

    .cell-container:hover .toolbar {
        opacity: 1;
    }

    .toolbar-btn {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 32px;
        height: 32px;
        border: none;
        background: transparent;
        border-radius: 4px;
        cursor: pointer;
        color: #555958;
        transition: all 0.2s ease;
    }

    .toolbar-btn:hover {
        background-color: rgba(0, 149, 242, 0.1);
        color: #0095f2;
    }

    .toolbar-btn.delete-btn:hover {
        background-color: rgba(255, 160, 0, 0.1);
        color: #ffa000;
    }

    .toolbar-btn .material-symbols-outlined {
        font-size: 18px;
        font-weight: 400;
    }



    .typing-indicator {
        font-size: 0.85rem;
        color: #ffa000;
        font-family: 'Raleway', sans-serif;
        font-style: italic;
        padding: 0.5rem 1rem;
        background-color: rgba(255, 160, 0, 0.1);
    }

    /* Temporary fallback styling */
    .temp-fallback {
        padding: 2rem;
        text-align: center;
        background: #f8f9fa;
        border: 2px dashed #dee2e6;
        border-radius: 8px;
        color: #6c757d;
        font-family: 'Raleway', sans-serif;
    }


</style>