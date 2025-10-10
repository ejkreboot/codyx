<script>
    import {CodeEdytor, RCodeEdytor} from 'code-edytor';
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


    // Execute function - run R code
    async function executeR() {
        if (controller && typeof controller.execute === 'function') {
            await controller.execute();
            // Update variables after execution since new ones might be created
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
            executeR();
        } else if (onKeydown && typeof onKeydown === 'function') {
            onKeydown(event);
        }
    }

    function handleInput(event) {
        // Call the parent's onInput if it exists
        if (onInput) {
            onInput(event);
        }
    }
</script>

<div class="r-cell-container">
    <div class="r-input-container">
        <div class="r-sub-gutter">
            <button 
                class="run-btn" 
                onclick={executeR}
                disabled={controller.isExecuting || !controller.text.trim()}
                title="Run R code (Shift+Enter)"
            >
                <span class="material-icons">
                    {controller.isExecuting ? 'hourglass_empty' : 'play_circle_filled'}
                </span>
            </button>
        </div>
        
        <div class="code-cell-main">
          <CodeEdytor editorClass={RCodeEdytor} 
            bind:this={codeEditor}
            bind:value={text} 
            availableVariables={vars}
            oninput={handleInput}
            onblur={handleBlur}
            onfocus={handleFocus}
            width="100%"
            minHeight="80px"
            maxHeight="600px"
            class="r-textarea"
          ></CodeEdytor>
        </div>
    </div>

    {#if controller.output}
        <div class="r-output">
            {#if controller.output.type === 'text'}
                <pre class="r-text-output">{controller.output.content}</pre>
            {:else if controller.output.type === 'plot'}
                {#if controller.output.plots && controller.output.plots.length > 0}
                    {#each controller.output.plots as plot, index}
                        <div class="r-plot-output">
                            <img src={plot} alt="R Plot {index + 1}" />
                        </div>
                    {/each}
                {:else}
                    <div class="r-plot-output">
                        <img src={controller.output.content} alt="R Plot" />
                    </div>
                {/if}
            {:else if controller.output.type === 'mixed'}
                <!-- Mixed output: both text and plots -->
                {#if controller.output.textContent && controller.output.textContent.trim()}
                    <pre class="r-text-output">{controller.output.textContent}</pre>
                {/if}
                {#if controller.output.plots && controller.output.plots.length > 0}
                    {#each controller.output.plots as plot, index}
                        <div class="r-plot-output">
                            <img src={plot} alt="R Plot {index + 1}" />
                        </div>
                    {/each}
                {/if}
            {:else if controller.output.type === 'data'}
                <div class="r-data-output">
                    <table class="r-table">
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
                <div class="r-error-output">
                    <div class="error-header">
                        <span class="material-icons">error</span>
                        R Error
                    </div>
                    <pre class="error-content">{controller.output.content}</pre>
                </div>
            {/if}
        </div>
    {/if}
        
    {#if controller.isExecuting}
        <div class="r-executing">
            <span class="material-icons spinning">sync</span>
            Executing R code...
        </div>
    {/if}
</div>

<style>
    @import url('https://fonts.googleapis.com/icon?family=Material+Icons');
    
    .r-cell-container {
        display: flex;
        flex-direction: column;
        gap: 0;
        width: 100%;
    }
    
    .r-input-container {
        display: flex;
        align-items: stretch;
        width: 100%;
        background: transparent;
    }
    
    .r-sub-gutter {
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
    
    :global(.r-textarea) {
        width: 100% !important;
        border: none !important;
        font-family: 'Cutive Mono', monospace;
        font-size: 14px;
        line-height: 1.5;
        color: #555958;
        background: transparent !important;
        resize: none;
    }
    
    .r-input-container:focus-within .r-sub-gutter {
        background: rgba(5, 75, 164, 0.05);
    }
    
    .run-btn {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 18px;
        min-width: 18px;
        height: 18px;
        font-family: Material Symbols Outlined;
        line-height: 18px;
        font-size: 16px;
        font-feature-settings: "liga";
        color: #054ba4;
        background: transparent;
        border: none;
        border-radius: 50%;
        cursor: pointer;
        transition: all 0.15s ease;
    }
    
    .run-btn:hover:not(:disabled) {
        color: #043a7d;
        transform: scale(1.1);
    }
    
    .run-btn:active:not(:disabled) {
        transform: scale(0.95);
    }
    
    .run-btn:disabled {
        color: #9ca3af;
        cursor: not-allowed;
        opacity: 0.6;
    }
    
    .run-btn .material-icons {
        font-size: 16px;
    }
    

    
    .r-output {
        width: calc(100% - 40px);
        margin-left: 40px;
        margin-top: 0;
        background: rgba(250, 163, 54, 0.08);
        overflow: hidden;
        max-height: 80vh;
        overflow-y: auto;
    }
    
    .r-text-output {
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
    

    
    .r-plot-output {
        padding: 1rem;
        text-align: center;
        background: transparent;
    }
    

    
    .r-plot-output img {
        max-width: 100%;
        height: auto;
        border-radius: 4px;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    }
    
    .r-data-output {
        padding: 1rem;
        background: transparent;
        overflow-x: auto;
    }
    
    .r-table {
        width: 100%;
        border-collapse: collapse;
        font-family: 'Cutive Mono', monospace;
        font-size: 12px;
    }
    
    .r-table th {
        background: #054ba4;
        color: white;
        padding: 8px 12px;
        text-align: left;
        font-weight: 600;
    }
    
    .r-table td {
        padding: 6px 12px;
        border-bottom: 1px solid #dee2e6;
        color: #495057;
    }
    
    .r-table tr:nth-child(even) td {
        background-color: #f8f9fa;
    }
    
    .r-error-output {
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
    
    .error-header .material-icons {
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
    
    .r-executing {
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
    
    /* R syntax highlighting hints */
    :global(.r-textarea::placeholder) {
        color: #054ba4;
        opacity: 0.5;
        font-style: italic;
    }
</style>