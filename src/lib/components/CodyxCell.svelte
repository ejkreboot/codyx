<script>
    import { onMount, onDestroy, createEventDispatcher } from 'svelte';
    import { LiveText } from '$lib/classes/live-text.js';
    import { supabase } from '$lib/util/supabase-client.js';
    import { collapsibleScript } from '$lib/util/enhanced-markdown.js';
    import { MarkdownCellController } from '$lib/classes/cells/MarkdownCellController.svelte.js';
    import { RCellController } from '$lib/classes/cells/RCellController.svelte.js';
    import { PythonCellController } from '$lib/classes/cells/PythonCellController.svelte.js';
    import DiffMatchPatch from 'diff-match-patch';

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
    let dirty = $state(false);
    let stale = $state(false);
    let saving = $state(false);
    let remoteTyping = $state(false);
    let pendingRemote = $state(null);
    let statusMessage = $state('');
    let conflictData = $state(null); // { serverContent, serverVersion, mergeChunks }
    let conflictChunks = $derived((conflictData?.mergeChunks ?? []).filter(chunk => chunk?.conflict));
    
    // Controller instance
    let controller = $state(null);
    
    // Event dispatcher
    const dispatch = createEventDispatcher();
    
    // Event handler functions for proper cleanup
    let handlePatched, handleTyping, handleConnectionChange, handleStatusChange, handleConflict, handleStale;

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
        controller?.updateText(newText);
        if (!sandboxed && liveText) {
            liveText.update(newText);
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

        async function saveCell() {
            if (sandboxed || !liveText) return;
            const result = await liveText.save();

            if (result?.success) {
                conflictData = null;
                stale = false;
                pendingRemote = null;
                statusMessage = '';
                dispatch('saved', { docId, text: controller?.text ?? '', version: liveText.version });
            } else if (result?.conflict) {
                conflictData = {
                    serverContent: result.serverContent,
                    serverVersion: result.serverVersion,
                    mergeChunks: result.mergeChunks
                };
                stale = true;
            } else if (result?.error) {
                statusMessage = result.error;
            }
        }

        function refreshFromServer() {
            if (!liveText) return;
            const incoming = pendingRemote ?? liveText.pendingRemote;
            if (!incoming) return;
            controller?.updateText(incoming.content ?? '');
            liveText.applyServerContent(incoming.content ?? '', incoming.version ?? liveText.version);
            conflictData = null;
            stale = false;
            dirty = false;
            pendingRemote = null;
        }

        async function useServerContent() {
            if (!conflictData) return;
            const { serverContent, serverVersion } = conflictData;
            controller?.updateText(serverContent ?? '');
            liveText?.applyServerContent(serverContent ?? '', serverVersion);
            conflictData = null;
            stale = false;
            dirty = false;
            await saveCell();
        }

        async function keepLocalAndRetry() {
            if (!conflictData) return;
            conflictData = null;
            stale = true;
            await saveCell();
        }

        async function saveMyVersion() {
            await keepLocalAndRetry();
        }

        function closeConflictModal() {
            conflictData = null;
        }

        function escapeHtml(text = '') {
            return text
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#39;')
                .replace(/\n/g, '<br>');
        }

        function generateDiffHighlights(serverText = '', localText = '') {
            // Only build the expensive diff when we actually have conflict data to show
            const dmp = new DiffMatchPatch();
            const diffs = dmp.diff_main(serverText, localText);
            dmp.diff_cleanupSemantic(diffs);

            let serverHtml = '';
            let localHtml = '';

            for (const [op, text] of diffs) {
                const escaped = escapeHtml(text);
                if (op === 0) {
                    serverHtml += escaped;
                    localHtml += escaped;
                } else if (op === -1) {
                    serverHtml += `<mark class="diff-highlight-server">${escaped}</mark>`;
                } else if (op === 1) {
                    localHtml += `<mark class="diff-highlight-local">${escaped}</mark>`;
                }
            }

            return { serverHtml, localHtml };
        }

        const diffHighlights = $derived(conflictData
            ? generateDiffHighlights(conflictData.serverContent ?? '', controller?.text ?? '')
            : { serverHtml: '', localHtml: '' });

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
        if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 's') {
            event.preventDefault();
            saveCell();
            return;
        }
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
            remoteTyping = Boolean(e.detail.typing && e.detail.source === 'remote');
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
        
        handleStatusChange = (e) => {
            dirty = e.detail.dirty;
            stale = e.detail.stale;
            saving = e.detail.saving;
            if (!stale) {
                pendingRemote = null;
            }
            if (e.detail.message) {
                statusMessage = e.detail.message;
            } else if (e.detail.status === 'clean') {
                statusMessage = '';
            }
        };

        handleConflict = (e) => {
            conflictData = {
                serverContent: e.detail.serverContent,
                serverVersion: e.detail.serverVersion,
                mergeChunks: e.detail.mergeChunks
            };
        };

        handleStale = (e) => {
            stale = true;
            pendingRemote = e.detail ?? null;
        };
        
        liveText.addEventListener('patched', handlePatched);
        liveText.addEventListener('typing', handleTyping);
        liveText.addEventListener('connectionchange', handleConnectionChange);
        liveText.addEventListener('statuschange', handleStatusChange);
        liveText.addEventListener('conflict', handleConflict);
        liveText.addEventListener('stale', handleStale);
        
        // Initialize connection state from LiveText
        connectionState = liveText.connectionState;
        dirty = liveText.status === 'dirty';

        // Inject collapsible functionality for markdown
        if (!window.toggleCollapsible) {
            const script = document.createElement('script');
            script.textContent = collapsibleScript;
            document.head.appendChild(script);
        }

    });

    // Auto-resize is now handled within each renderer component

    onDestroy(() => {
        liveText?.removeEventListener('patched', handlePatched);
        liveText?.removeEventListener('typing', handleTyping);
        liveText?.removeEventListener('connectionchange', handleConnectionChange);
        liveText?.removeEventListener('statuschange', handleStatusChange);
        liveText?.removeEventListener('conflict', handleConflict);
        liveText?.removeEventListener('stale', handleStale);
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
        <div class="cell-status-dots" aria-label="cell status">
            {#if saving}
                <span class="dot saving" title="Saving"></span>
            {:else if stale}
                <button class="stale-refresh-btn" onclick={refreshFromServer} title="Load latest from server">
                    <span class="material-symbols-outlined">refresh</span>
                </button>
            {/if}
        </div>
        <div class="cell-actions" aria-label="cell actions and presence">
            <button
                class="save-gutter-btn"
                class:active={dirty || stale}
                onclick={saveCell}
                title="Save (Ctrl/Cmd+S)"
                disabled={(!dirty && !stale) || saving}
            >
                <span class="material-symbols-outlined">{stale ? 'merge' : 'save'}</span>
            </button>
            <div class="cell-typing-indicator" class:active={remoteTyping} aria-label="remote user typing" title="Someone is editing">
                <span class="material-symbols-outlined">person_edit</span>
            </div>
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
    </div>
</div>

{#if conflictData}
<div class="conflict-modal">
    <div class="conflict-card">
        <div class="conflict-header">
            <h4>Merge conflict</h4>
            <button class="btn tertiary small icon-only" onclick={closeConflictModal} title="Close">
                <span class="material-symbols-outlined">close</span>
            </button>
        </div>
        <p class="conflict-copy">Current version saved on server includes edits that conflict with yours. Please review below.</p>

        <div class="conflict-panels">
            <div class="panel">
                <div class="panel-title">Current server version</div>
                <pre class="panel-pre server" aria-label="server content">{@html diffHighlights.serverHtml}</pre>
            </div>
            <div class="panel">
                <div class="panel-title">Your current edits</div>
                <pre class="panel-pre mine" aria-label="your content">{@html diffHighlights.localHtml}</pre>
            </div>
        </div>
        <div class="conflict-actions">
            <button class="btn secondary" onclick={useServerContent}>Keep Server Version</button>
            <button class="btn primary" onclick={saveMyVersion}>Save My Version</button>
            <button class="btn tertiary" onclick={closeConflictModal}>Go Back & Edit</button>
        </div>
    </div>
</div>
{/if}

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

    .cell-status-dots {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
        min-height: 24px;
    }

    .cell-actions {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 8px;
        min-height: 48px;
    }

    .stale-refresh-btn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 24px;
        height: 24px;
        padding: 0;
        border: none;
        background: rgba(255, 160, 0, 0.15);
        color: #b36b00;
        border-radius: 6px;
        cursor: pointer;
        transition: all 0.2s ease;
    }

    .stale-refresh-btn:hover {
        background: rgba(255, 160, 0, 0.22);
        color: #8f5200;
        transform: translateY(-1px);
    }

    .stale-refresh-btn .material-symbols-outlined {
        font-size: 16px;
    }

    .cell-typing-indicator {
        display: flex;
        align-items: center;
        justify-content: center;
        min-height: 24px;
        color: #cbd5e0;
        transition: color 0.2s ease, opacity 0.2s ease;
    }

    .cell-typing-indicator.active {
        color: #ffa000;
        opacity: 1;
    }

    .cell-typing-indicator .material-symbols-outlined {
        font-size: 16px;
    }

    .dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        display: inline-block;
    }

    .dot.stale { background: var(--color-accent-1); }
    .dot.saving { background: #6c757d; animation: pulse 1s ease-in-out infinite; }

    .save-gutter-btn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 24px;
        height: 24px;
        padding: 0;
        border: none;
        background: rgba(0, 0, 0, 0.04);
        color: #cbd5e0;
        border-radius: 6px;
        cursor: pointer;
        transition: all 0.2s ease;
    }

    .save-gutter-btn.active {
        background: rgba(0, 149, 242, 0.12);
        color: #0095f2;
    }

    .save-gutter-btn:disabled {
        cursor: default;
        opacity: 0.8;
    }

    .save-gutter-btn:hover:not(:disabled) {
        background: rgba(0, 149, 242, 0.18);
        color: #006bb3;
        transform: translateY(-1px);
    }

    .save-gutter-btn .material-symbols-outlined {
        font-size: 16px;
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

    @keyframes pulse {
        0% { opacity: 0.4; }
        50% { opacity: 1; }
        100% { opacity: 0.4; }
    }

    .toolbar-btn.delete-btn:hover {
        background-color: rgba(255, 160, 0, 0.1);
        color: #ffa000;
    }

    .toolbar-btn .material-symbols-outlined {
        font-size: 18px;
        font-weight: 400;
    }



        .status-pill {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            padding: 6px 10px;
            border-radius: 10px;
            font-size: 11px;
            font-weight: 600;
            margin: 6px 0;
            width: fit-content;
        }

        .status-pill.dirty {
            background: rgba(0, 149, 242, 0.12);
            color: #006bb3;
        }

        .status-pill.stale {
            background: rgba(255, 160, 0, 0.15);
            color: #b36b00;
        }

        .status-pill.saving {
            background: rgba(108, 117, 125, 0.15);
            color: #444;
        }

        .status-pill.error {
            background: rgba(220, 53, 69, 0.12);
            color: #b02a37;
        }

        .conflict-modal {
            position: fixed;
            inset: 0;
            background: rgba(0, 0, 0, 0.35);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 1200;
            padding: 12px;
        }

        .conflict-card {
            background: #fff;
            width: min(900px, 95vw);
            max-height: 90vh;
            border-radius: var(--border-radius-lg, 8px);
            padding: var(--space-5, 1.25rem);
            box-shadow: 0 12px 40px rgba(0, 0, 0, 0.2);
            display: flex;
            flex-direction: column;
            gap: var(--space-4, 1rem);
            font-family: var(--font-family-sans);
            overflow: hidden;
        }

        .conflict-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding-bottom: var(--space-2, 0.5rem);
            border-bottom: 1px solid var(--gray-200, #e9ecef);
        }

        .conflict-header h4 {
            margin: 0;
            font-size: var(--text-xl, 1.125rem);
            font-weight: 600;
            color: var(--gray-700, #333);
        }

        .conflict-copy {
            margin: 0;
            font-size: var(--text-base, 0.875rem);
            line-height: var(--leading-relaxed, 1.6);
            color: var(--gray-600, #495057);
        }

        .conflict-chunks {
            display: flex;
            flex-direction: column;
            gap: 10px;
        }

        .conflict-hunk {
            border: 1px solid #e5e7eb;
            border-radius: 10px;
            background: #f5f7fb;
            padding: 10px;
        }

        .conflict-hunk-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            font-weight: 700;
            font-size: 12px;
            color: #374151;
        }

        .hunk-meta {
            font-weight: 600;
            font-size: 11px;
            color: #6b7280;
        }

        .conflict-columns {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
            gap: 8px;
            margin-top: 8px;
        }

        .conflict-block {
            border: 1px solid #d8dee9;
            border-radius: 8px;
            background: #ffffff;
            padding: 8px;
            min-height: 80px;
            font-family: 'Cutive Mono', monospace;
            font-size: 12px;
            white-space: pre-wrap;
            line-height: 1.4;
            box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.6);
        }

        .conflict-panels {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
            gap: var(--space-3, 0.75rem);
            flex: 1;
            min-height: 0;
            overflow: auto;
        }

        .panel {
            display: flex;
            flex-direction: column;
            min-height: 0;
        }

        .panel-title {
            font-size: var(--text-sm, 0.75rem);
            font-weight: 600;
            color: var(--gray-600, #495057);
            margin-bottom: var(--space-2, 0.5rem);
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }

        .panel-pre {
            border: 1px solid #d8dee9;
            border-radius: var(--border-radius, 4px);
            background: #ffffff;
            padding: var(--space-3, 0.75rem);
            min-height: 160px;
            max-height: 400px;
            font-family: 'Cutive Mono', monospace;
            font-size: var(--text-sm, 0.75rem);
            white-space: pre-wrap;
            line-height: 1.5;
            overflow: auto;
            box-sizing: border-box;
            flex: 1;
        }

        .panel-pre.server {
            background: linear-gradient(180deg, #fff7ed 0%, #fff2d8 100%);
            border-color: #f9d06a;
        }

        .panel-pre.mine {
            background: linear-gradient(180deg, #ecf7ff 0%, #d9edff 100%);
            border-color: #9dc5f5;
        }

        .diff-highlight-server {
            background-color: #e8a838;
            border-radius: 2px;
            padding: 0 1px;
        }

        .diff-highlight-local {
            background-color: #4a9eda;
            border-radius: 2px;
            padding: 0 1px;
        }

        .conflict-line {
            background: rgba(220, 53, 69, 0.12);
            color: #b02a37;
            display: block;
            padding: 2px 4px;
            margin: 0 -4px;
            border-radius: 4px;
        }

        .conflict-actions {
            display: flex;
            justify-content: flex-end;
            gap: var(--space-2, 0.5rem);
            flex-wrap: wrap;
            padding-top: var(--space-3, 0.75rem);
            border-top: 1px solid var(--gray-200, #e9ecef);
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