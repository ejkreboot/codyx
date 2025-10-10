<script>
    import {CodeEdytor, PythonCodeEdytor} from 'code-edytor';
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

    // Execute function - run Python code
    async function executePython() {
        if (renderer && typeof renderer.execute === 'function') {
            await renderer.execute();
            // Update variables after execution since new ones might be created
            vars = await renderer.getVariables();
            console.log('Variables after Python execution:', vars);
        }
    }
    
    async function handleFocus() {
        if (onStartEditing && typeof onStartEditing === 'function') {
            onStartEditing();
        }
        vars = await renderer.getVariables();
        console.log('Current Python variables:', vars);
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
            executePython();
        } else if (onKeydown && typeof onKeydown === 'function') {
            onKeydown(event);
        }
    }

</script>

<div class="python-cell-container">
    <div class="python-input-container">
        <div class="python-sub-gutter">
            <button 
                class="run-btn" 
                onclick={executePython}
                disabled={renderer.isExecuting || !renderer.text.trim()}
                title="Run Python code (Shift+Enter)"
            >
                <span class="material-symbols-outlined">
                    {renderer.isExecuting ? 'hourglass_empty' : 'play_arrow'}
                </span>
            </button>
        </div>
        
        <div class="code-cell-main">
          <CodeEdytor editorClass={PythonCodeEdytor} 
            bind:this={codeEditor}
            bind:value={text} 
            availableVariables={vars}
            oninput={onInput}
            onblur={handleBlur}
            onfocus={handleFocus}
            class="python-textarea"
          ></CodeEdytor>
    </div>

    {#if renderer.output}
        <div class="python-output">
            {#if renderer.output.type === 'text'}
                <pre class="python-text-output">{renderer.output.content}</pre>
            {:else if renderer.output.type === 'plot'}
                {#if renderer.output.plots && renderer.output.plots.length > 0}
                    {#each renderer.output.plots as plot, index}
                        <div class="python-plot-output">
                            <img src={plot} alt="Python Plot {index + 1}" />
                        </div>
                    {/each}
                {:else}
                    <div class="python-plot-output">
                        <img src={renderer.output.content} alt="Python Plot" />
                    </div>
                {/if}
            {:else if renderer.output.type === 'mixed'}
                <!-- Mixed output: both text and plots -->
                {#if renderer.output.textContent && renderer.output.textContent.trim()}
                    <pre class="python-text-output">{renderer.output.textContent}</pre>
                {/if}
                {#if renderer.output.plots && renderer.output.plots.length > 0}
                    {#each renderer.output.plots as plot, index}
                        <div class="python-plot-output">
                            <img src={plot} alt="Python Plot {index + 1}" />
                        </div>
                    {/each}
                {/if}
            {:else if renderer.output.type === 'data'}
                <div class="python-data-output">
                    <table class="python-table">
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
                <div class="python-error-output">
                    <div class="error-header">
                        <span class="material-symbols-outlined">error</span>
                        Python Error
                    </div>
                    <pre class="error-content">{renderer.output.content}</pre>
                </div>
            {/if}
        </div>
    {/if}
        
    {#if renderer.isExecuting}
        <div class="python-executing">
            <span class="material-symbols-outlined spinning">sync</span>
            Executing Python code...
        </div>
    {/if}
</div>
</div>

<style>
    @import 'material-symbols';
    
    .python-cell-container {
        display: flex;
        flex-direction: column;
        gap: 8px;
    }
    
    .python-input-container {
        display: flex;
        align-items: flex-start;
        gap: 0;
    }
    
    .python-sub-gutter {
        display: flex;
        flex-direction: column;
        align-items: center;
        width: 40px;
        min-width: 40px;
        padding: 8px 4px;
        background: rgba(255, 255, 255);
        border-right: none;
    }
    
    :global(.python-textarea) {
        flex: 1;
        min-height: 80px;
        max-height: 600px;
        padding: 0.75rem 1rem;
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
    
    .python-input-container:focus-within .python-sub-gutter {
        background: rgba(255, 255, 255, 0.08);
        border-right-color: #054ba4;
    }
    
    :global(.python-textarea:focus) {
        background-color: rgba(5, 75, 164, 0.03);
    }
    
    .run-btn {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 16px;
        min-width: 16px;
        height: 16px;
        margin-top: 10px;
        font-family: Material Symbols Outlined;
        line-height: 16px;
        font-size: 12px;
        font-feature-settings: "liga";
        color: var(--color-accent-2);
        background: #f2f2f2;
        border: 1.5px solid var(--color-accent-2);
        border-radius: 50%;
        cursor: pointer;
        transition: all 0.15s ease;
    }
    
    .run-btn:hover:not(:disabled) {
        background: #043a82;
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
    

    
    .python-output {
        background: #f8f9fa;
        border-radius: 6px;
        border: 1px solid #e9ecef;
        overflow: hidden;
    }
    
    .python-text-output {
        padding: 1rem;
        margin: 0;
        font-family: 'Cutive Mono', monospace;
        font-size: 13px;
        line-height: 1.4;
        color: #495057;
        background: white;
        white-space: pre-wrap;
        overflow-x: auto;
        border-bottom: 1px solid #f0f0f0;
    }
    
    .python-text-output:last-child {
        border-bottom: none;
    }
    
    .python-plot-output {
        padding: 1rem;
        text-align: center;
        background: white;
        border-bottom: 1px solid #f0f0f0;
    }
    
    .python-plot-output:last-child {
        border-bottom: none;
    }
    
    .python-plot-output img {
        max-width: 100%;
        height: auto;
        border-radius: 4px;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    }
    
    .python-data-output {
        padding: 1rem;
        background: white;
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
    
    /* Python syntax highlighting hints */
    :global(.python-textarea::placeholder) {
        color: #054ba4;
        opacity: 0.6;
    }
</style>