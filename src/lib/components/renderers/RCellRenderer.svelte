<script>
    import {CodeEdytor, RCodeEdytor} from 'code-edytor';
    let {
        renderer,
        codeEditor = $bindable(),
        onInput,
        onStartEditing,
        onStopEditing, 
        onKeydown
    } = $props();

    let vars = $state([]);
    let text = $derived(renderer ? renderer.text : '');


    // Execute function - run R code
    async function executeR() {
        if (renderer && typeof renderer.execute === 'function') {
            await renderer.execute();
            // Update variables after execution since new ones might be created
            vars = await renderer.getVariables();
        }
    }

    async function handleFocus() {
        if (onStartEditing && typeof onStartEditing === 'function') {
            onStartEditing();
        }
        vars = await renderer.getVariables();
    }

    async function handleBlur() {
        if (onStopEditing && typeof onStopEditing === 'function') {
            onStopEditing();
        }
        // Optionally update variables on blur to catch any changes
        vars = await renderer.getVariables();
    }

    function handleKeydown(event) {
        if (event.shiftKey && event.key === 'Enter') {
            event.preventDefault();
            executeR();
        } else if (onKeydown && typeof onKeydown === 'function') {
            onKeydown(event);
        }
    }
</script>

<div class="r-cell-container">
    <div class="r-input-container">
        <div class="r-sub-gutter">
            <button 
                class="run-btn" 
                onclick={executeR}
                disabled={renderer.isExecuting || !renderer.text.trim()}
                title="Run R code (Shift+Enter)"
            >
                <span class="material-symbols-outlined">
                    {renderer.isExecuting ? 'hourglass_empty' : 'play_arrow'}
                </span>
            </button>
        </div>
        
        <div class="code-cell-main">
          <CodeEdytor editorClass={RCodeEdytor} 
            bind:this={codeEditor}
            bind:value={text} 
            availableVariables={vars}
            oninput={onInput}
            onblur={handleBlur}
            onfocus={handleFocus}
            width="100%"
            minHeight="80px"
            maxHeight="600px"
            class="r-textarea"
          ></CodeEdytor>
        </div>
    </div>

    {#if renderer.output}
        <div class="r-output">
            {#if renderer.output.type === 'text'}
                <pre class="r-text-output">{renderer.output.content}</pre>
            {:else if renderer.output.type === 'plot'}
                {#if renderer.output.plots && renderer.output.plots.length > 0}
                    {#each renderer.output.plots as plot, index}
                        <div class="r-plot-output">
                            <img src={plot} alt="R Plot {index + 1}" />
                        </div>
                    {/each}
                {:else}
                    <div class="r-plot-output">
                        <img src={renderer.output.content} alt="R Plot" />
                    </div>
                {/if}
            {:else if renderer.output.type === 'mixed'}
                <!-- Mixed output: both text and plots -->
                {#if renderer.output.textContent && renderer.output.textContent.trim()}
                    <pre class="r-text-output">{renderer.output.textContent}</pre>
                {/if}
                {#if renderer.output.plots && renderer.output.plots.length > 0}
                    {#each renderer.output.plots as plot, index}
                        <div class="r-plot-output">
                            <img src={plot} alt="R Plot {index + 1}" />
                        </div>
                    {/each}
                {/if}
            {:else if renderer.output.type === 'data'}
                <div class="r-data-output">
                    <table class="r-table">
                        <thead>
                            <tr>
                                {#each renderer.output.columns as col}
                                    <th>{col}</th>
                                {/each}
                            </tr>
                        </thead>
                        <tbody>
                            {#each renderer.output.rows as row}
                                <tr>
                                    {#each row as cell}
                                        <td>{cell}</td>
                                    {/each}
                                </tr>
                            {/each}
                        </tbody>
                    </table>
                </div>
            {:else if renderer.output.type === 'error'}
                <div class="r-error-output">
                    <div class="error-header">
                        <span class="material-symbols-outlined">error</span>
                        R Error
                    </div>
                    <pre class="error-content">{renderer.output.content}</pre>
                </div>
            {/if}
        </div>
    {/if}
        
    {#if renderer.isExecuting}
        <div class="r-executing">
            <span class="material-symbols-outlined spinning">sync</span>
            Executing R code...
        </div>
    {/if}
</div>

<style>
    @import 'material-symbols';
    
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
        width: 20px;
        min-width: 20px;
        height: 20px;
        font-family: Material Symbols Outlined;
        line-height: 20px;
        font-size: 14px;
        font-feature-settings: "liga";
        color: #054ba4;
        background: white;
        border: 1.5px solid #054ba4;
        border-radius: 50%;
        cursor: pointer;
        transition: all 0.15s ease;
        box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
    }
    
    .run-btn:hover:not(:disabled) {
        background: #054ba4;
        color: white;
        box-shadow: 0 2px 6px rgba(5, 75, 164, 0.4);
        transform: scale(1.1);
    }
    
    .run-btn:active:not(:disabled) {
        transform: scale(0.95);
        box-shadow: 0 1px 3px rgba(5, 75, 164, 0.3);
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