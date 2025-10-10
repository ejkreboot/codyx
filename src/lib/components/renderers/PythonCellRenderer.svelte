<script>
    import {CodeEdytor, PythonCodeEdytor} from 'code-edytor';
    let {
        controller,
        codeEditor = $bindable(),
        onInput,
        onStartEditing,
        onStopEditing, 
        onKeydown
    } = $props();

    let vars = $state([]);
    let text = $derived(controller ? controller.text : '');

    // Make import suggestions reactive to controller changes
    let importSuggestions = $derived(controller ? controller.importSuggestions : []);    // Execute function - run Python code
    async function executeCode() {
        if (controller && typeof controller.execute === 'function') {
            await controller.execute();
            
            vars = await controller.getVariables();
        }
    }
    
    async function handleFocus() {
        if (onStartEditing && typeof onStartEditing === 'function') {
            onStartEditing();
        }
        vars = await controller.getVariables();
    }

    async function handleBlur() {
        if (onStopEditing && typeof onStopEditing === 'function') {
            onStopEditing();
        }
        // Optionally update variables on blur to catch any changes
        vars = await controller.getVariables();
    }

    function handleKeydown(event) {
        if (event.shiftKey && event.key === 'Enter') {
            event.preventDefault();
            executeCode();
        } else if (onKeydown && typeof onKeydown === 'function') {
            onKeydown(event);
        }
    }

    function handleInput(event) {
        // Call the controller's handleInput method to trigger import suggestions
        if (controller && controller.handleInput) {
            controller.handleInput(event);
        }
        
        // Call the parent's onInput if it exists
        if (onInput) {
            onInput(event);
        }
    }

</script>

<div class="python-cell-container">
    <div class="python-input-container">
        <div class="python-sub-gutter">
            <button 
                class="run-btn" 
                onclick={executeCode}
                disabled={controller.isExecuting || !controller.text.trim()}
                title="Run Python code (Shift+Enter)"
            >
                <span class="material-symbols-outlined">
                    {controller.isExecuting ? 'hourglass_empty' : 'play_arrow'}
                </span>
            </button>
        </div>
        
        <div class="code-cell-main">
        <CodeEdytor 
            editorClass={PythonCodeEdytor}
            bind:this={codeEditor}
            bind:value={text}
            width="100%"
            minHeight="80px"  
            maxHeight="600px"
            availableVariables={vars}
            oninput={handleInput}
            onfocus={handleFocus}
            onblur={handleBlur}
            class="python-textarea"
        />
        </div>
    </div>

    {#if importSuggestions && importSuggestions.length > 0}
        <div class="import-suggestions">
            {#each importSuggestions as suggestion}
                <div class="suggestion-item">
                    <div class="suggestion-content">
                        <span class="material-symbols-outlined">download</span>
                        <span class="suggestion-text">
                            Install <strong>{suggestion.installName}</strong> for <code>{suggestion.packageName}</code>?
                        </span>
                    </div>
                    <div class="suggestion-actions">
                        <button 
                            class="install-btn"
                            onclick={() => controller.insertInstallCode(suggestion)}
                        >
                            Install
                        </button>
                        <button 
                            class="dismiss-btn"
                            onclick={() => {
                                controller.importSuggestions = controller.importSuggestions.filter(s => s !== suggestion);
                            }}
                        >
                            Dismiss
                        </button>
                    </div>
                </div>
            {/each}
        </div>
    {/if}

    {#if controller.output}
        <div class="python-output">
            {#if controller.output.type === 'text'}
                <pre class="python-text-output">{controller.output.content}</pre>
            {:else if controller.output.type === 'plot'}
                {#if controller.output.plots && controller.output.plots.length > 0}
                    {#each controller.output.plots as plot, index}
                        <div class="python-plot-output">
                            <img src={plot} alt="Python Plot {index + 1}" />
                        </div>
                    {/each}
                {:else}
                    <div class="python-plot-output">
                        <img src={controller.output.content} alt="Python Plot" />
                    </div>
                {/if}
            {:else if controller.output.type === 'mixed'}
                <!-- Mixed output: both text and plots -->
                {#if controller.output.textContent && controller.output.textContent.trim()}
                    <pre class="python-text-output">{controller.output.textContent}</pre>
                {/if}
                {#if controller.output.plots && controller.output.plots.length > 0}
                    {#each controller.output.plots as plot, index}
                        <div class="python-plot-output">
                            <img src={plot} alt="Python Plot {index + 1}" />
                        </div>
                    {/each}
                {/if}
            {:else if controller.output.type === 'data'}
                <div class="python-data-output">
                    <table class="python-table">
                        <thead>
                            <tr>
                                {#each controller.output.columns as col}
                                    <th>{col}</th>
                                {/each}
                            </tr>
                        </thead>
                        <tbody>
                            {#each controller.output.rows as row}
                                <tr>
                                    {#each row as cell}
                                        <td>{cell}</td>
                                    {/each}
                                </tr>
                            {/each}
                        </tbody>
                    </table>
                </div>
            {:else if controller.output.type === 'error'}
                <div class="python-error-output">
                    <div class="error-header">
                        <span class="material-symbols-outlined">error</span>
                        Python Error
                    </div>
                    <pre class="error-content">{controller.output.content}</pre>
                </div>
            {/if}
        </div>
    {/if}
        
    {#if controller.isExecuting}
        <div class="python-executing">
            <span class="material-symbols-outlined spinning">sync</span>
            Executing Python code...
        </div>
    {/if}
</div>


<style>
    @import 'material-symbols';
    
    .python-cell-container {
        display: flex;
        flex-direction: column;
        gap: 0;
        width: 100%;
    }
    
    .python-input-container {
        display: flex;
        align-items: stretch;
        width: 100%;
        background: transparent;
    }
    
    .python-sub-gutter {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: flex-start;
        width: 32px;
        min-width: 32px;
        padding: 8px 4px;
        background: transparent;
    }
    
    .code-cell-main {
        flex: 1;
        display: flex;
        width: 100%;
    }
    
    :global(.python-textarea) {
        width: 100% !important;
        border: none !important;
        font-family: 'Cutive Mono', monospace;
        font-size: 14px;
        line-height: 1.5;
        color: #555958;
        background: transparent !important;
        resize: none;
    }
    
    .python-input-container:focus-within .python-sub-gutter {
        background: rgba(55, 118, 171, 0.05);
    }
    
    .run-btn {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 20px;
        min-width: 20px;
        height: 20px;
        font-family: Material Symbols Outlined;
        line-height: 20px;
        font-size: 14px;
        font-feature-settings: "liga";
        color: #3776ab;
        background: white;
        border: 1.5px solid #3776ab;
        border-radius: 50%;
        cursor: pointer;
        transition: all 0.15s ease;
        box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
    }
    
    .run-btn:hover:not(:disabled) {
        background: #3776ab;
        color: white;
        box-shadow: 0 2px 6px rgba(55, 118, 171, 0.4);
        transform: scale(1.1);
    }
    
    .run-btn:active:not(:disabled) {
        transform: scale(0.95);
        box-shadow: 0 1px 3px rgba(55, 118, 171, 0.3);
    }
    
    .run-btn:disabled {
        background: #9ca3af;
        cursor: not-allowed;
        box-shadow: none;
        opacity: 0.6;
    }
    
    .run-btn .material-symbols-outlined {
        font-size: 14px;
    }
    

    
    .python-output {
        width: calc(100% - 40px);
        margin-left: 40px;
        margin-top: 0;
        background: rgba(250, 163, 54, 0.08);
        overflow: hidden;
        max-height: 80vh;
        overflow-y: auto;
    }
    
    .python-text-output {
        padding: 1rem;
        margin: 0;
        font-family: 'Cutive Mono', monospace;
        font-size: 13px;
        line-height: 1.4;
        color: #495057;
        background: transparent;
        white-space: pre-wrap;
        overflow-x: auto;
    }
    

    
    .python-plot-output {
        padding: 1rem;
        text-align: center;
        background: transparent;
    }
    

    
    .python-plot-output img {
        max-width: 100%;
        height: auto;
        border-radius: 4px;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    }
    
    .python-data-output {
        padding: 1rem;
        background: transparent;
        overflow-x: auto;
    }
    
    .python-table {
        width: 100%;
        border-collapse: collapse;
        font-family: 'Cutive Mono', monospace;
        font-size: 12px;
    }
    
    .python-table th {
        background: #054ba4;
        color: white;
        padding: 8px 12px;
        text-align: left;
        font-weight: 600;
    }
    
    .python-table td {
        padding: 6px 12px;
        border-bottom: 1px solid #dee2e6;
        color: #495057;
    }
    
    .python-table tr:nth-child(even) td {
        background-color: #f8f9fa;
    }
    
    .python-error-output {
        background: #fff5f5;
        border-left: 4px solid #dc3545;
    }
    
    .error-header {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 12px 16px;
        background: #f8d7da;
        border-bottom: 1px solid #f5c2c7;
        font-weight: 600;
        color: #721c24;
        font-family: 'Raleway', sans-serif;
    }
    
    .error-header .material-symbols-outlined {
        font-size: 18px;
    }
    
    .error-content {
        padding: 16px;
        margin: 0;
        font-family: 'Cutive Mono', monospace;
        font-size: 13px;
        line-height: 1.4;
        color: #721c24;
        background: white;
        white-space: pre-wrap;
    }
    
    .python-executing {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 12px 16px;
        background: rgba(5, 75, 164, 0.1);
        border-radius: 6px;
        color: #054ba4;
        font-family: 'Raleway', sans-serif;
        font-weight: 500;
        font-size: 14px;
    }
    
    .spinning {
        animation: spin 1s linear infinite;
    }
    
    @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
    }
    
    /* Import suggestions styling */
    .import-suggestions {
        width: calc(100% - 40px);
        margin-left: 40px;
        margin-top: 8px;
        margin-bottom: 8px;
        display: flex;
        flex-direction: column;
        gap: 8px;
    }
    
    .suggestion-item {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 12px 16px;
        background: rgba(255, 193, 7, 0.1);
        border: 1px solid rgba(255, 193, 7, 0.3);
        border-radius: 6px;
        font-family: 'Raleway', sans-serif;
        font-size: 14px;
    }
    
    .suggestion-content {
        display: flex;
        align-items: center;
        gap: 8px;
        color: #856404;
    }
    
    .suggestion-content .material-symbols-outlined {
        font-size: 18px;
        color: #ffc107;
    }
    
    .suggestion-text {
        flex: 1;
    }
    
    .suggestion-text code {
        background: rgba(255, 193, 7, 0.2);
        padding: 2px 6px;
        border-radius: 3px;
        font-family: 'Cutive Mono', monospace;
        font-size: 13px;
        color: #856404;
    }
    
    .suggestion-actions {
        display: flex;
        gap: 8px;
    }
    
    .install-btn {
        background: #28a745;
        color: white;
        border: none;
        border-radius: 4px;
        padding: 6px 12px;
        font-family: 'Raleway', sans-serif;
        font-size: 12px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.15s ease;
    }
    
    .install-btn:hover {
        background: #218838;
        transform: translateY(-1px);
        box-shadow: 0 2px 4px rgba(40, 167, 69, 0.3);
    }
    
    .dismiss-btn {
        background: transparent;
        color: #6c757d;
        border: 1px solid #6c757d;
        border-radius: 4px;
        padding: 6px 12px;
        font-family: 'Raleway', sans-serif;
        font-size: 12px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.15s ease;
    }
    
    .dismiss-btn:hover {
        background: #6c757d;
        color: white;
        transform: translateY(-1px);
        box-shadow: 0 2px 4px rgba(108, 117, 125, 0.3);
    }

    /* Python syntax highlighting hints */
    :global(.python-textarea::placeholder) {
        color: #3776ab;
        opacity: 0.5;
        font-style: italic;
    }
</style>