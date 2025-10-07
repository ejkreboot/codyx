<script>
    let props = $props();
    let renderer = props.renderer;
    let textareaElement = $state(props.textareaElement);
    let onInput = props.onInput;
    let onStartEditing = props.onStartEditing;
    let onStopEditing = props.onStopEditing;
    let onKeydown = props.onKeydown;
</script>

<div class="r-cell-container">
    <textarea 
        bind:this={textareaElement}
        bind:value={renderer.text}
        oninput={onInput}
        onblur={onStopEditing}
        onfocus={onStartEditing}
        class="r-textarea"
        placeholder="Enter R code..."
        spellcheck="false"
    ></textarea>
    
    {#if renderer.output}
        <div class="r-output">
            {#if renderer.output.type === 'text'}
                <pre class="r-text-output">{renderer.output.content}</pre>
            {:else if renderer.output.type === 'plot'}
                <div class="r-plot-output">
                    <img src={renderer.output.content} alt="R Plot" />
                </div>
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
        gap: 8px;
    }
    
    .r-textarea {
        width: 100%;
        min-height: 80px;
        max-height: 600px;
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
    
    .r-textarea:focus {
        background-color: rgba(5, 75, 164, 0.05);
        border-left: 3px solid #054ba4;
    }
    
    .r-output {
        background: #f8f9fa;
        border-radius: 6px;
        border: 1px solid #e9ecef;
        overflow: hidden;
    }
    
    .r-text-output {
        padding: 1rem;
        margin: 0;
        font-family: 'Cutive Mono', monospace;
        font-size: 13px;
        line-height: 1.4;
        color: #495057;
        background: white;
        white-space: pre-wrap;
        overflow-x: auto;
    }
    
    .r-plot-output {
        padding: 1rem;
        text-align: center;
        background: white;
    }
    
    .r-plot-output img {
        max-width: 100%;
        height: auto;
        border-radius: 4px;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    }
    
    .r-data-output {
        padding: 1rem;
        background: white;
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
    .r-textarea::placeholder {
        color: #054ba4;
        opacity: 0.6;
    }
</style>