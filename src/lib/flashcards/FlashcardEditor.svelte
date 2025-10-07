<script>
    import { createEventDispatcher } from 'svelte';
    import { marked } from 'marked';
    import katex from 'katex';

    let props = $props();
    let card = props.card ?? { question: '', answer: '' };
    let onSave = props.onSave ?? (() => {});
    let onCancel = props.onCancel ?? (() => {});
    let onDelete = props.onDelete ?? (() => {});
    
    const dispatch = createEventDispatcher();
    
    // Editing state
    let isEditingQuestion = $state(false);
    let isEditingAnswer = $state(false);
    let questionText = $state(card.question);
    let answerText = $state(card.answer);
    let questionTextarea = $state();
    let answerTextarea = $state();

    // Configure marked with KaTeX support
    const renderer = new marked.Renderer();
    
    // Override code renderer to handle KaTeX
    renderer.code = function(code, lang) {
        if (lang === 'math' || lang === 'latex') {
            try {
                return katex.renderToString(code, { displayMode: true });
            } catch (e) {
                return `<pre><code>${code}</code></pre>`;
            }
        }
        return `<pre><code>${code}</code></pre>`;
    };

    // Handle inline math with $...$
    function processInlineMath(text) {
        return text.replace(/\$([^$]+)\$/g, (match, math) => {
            try {
                return katex.renderToString(math, { displayMode: false });
            } catch (e) {
                return match;
            }
        });
    }

    // Parse markdown with KaTeX
    function parseMarkdown(text) {
        if (!text) return '';
        
        marked.setOptions({
            renderer: renderer,
            breaks: true,
            gfm: true
        });
        
        // Process inline math first
        const withInlineMath = processInlineMath(text);
        return marked(withInlineMath);
    }

    // Derived rendered content
    let questionHtml = $derived(parseMarkdown(questionText));
    let answerHtml = $derived(parseMarkdown(answerText));

    function startEditingQuestion() {
        isEditingQuestion = true;
        setTimeout(() => {
            if (questionTextarea) {
                questionTextarea.focus();
                questionTextarea.select();
            }
        }, 0);
    }

    function startEditingAnswer() {
        isEditingAnswer = true;
        setTimeout(() => {
            if (answerTextarea) {
                answerTextarea.focus();
                answerTextarea.select();
            }
        }, 0);
    }

    function saveQuestion() {
        isEditingQuestion = false;
        saveCard();
    }

    function saveAnswer() {
        isEditingAnswer = false;
        saveCard();
    }

    function cancelQuestion() {
        questionText = card.question;
        isEditingQuestion = false;
    }

    function cancelAnswer() {
        answerText = card.answer;
        isEditingAnswer = false;
    }

    function saveCard() {
        const updatedCard = {
            ...card,
            question: questionText,
            answer: answerText
        };
        onSave(updatedCard);
        dispatch('save', updatedCard);
    }

    function handleDelete() {
        onDelete(card);
        dispatch('delete', card);
    }

    function handleQuestionKeydown(event) {
        if (event.key === 'Escape') {
            cancelQuestion();
        } else if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
            event.preventDefault();
            saveQuestion();
        }
    }

    function handleAnswerKeydown(event) {
        if (event.key === 'Escape') {
            cancelAnswer();
        } else if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
            event.preventDefault();
            saveAnswer();
        }
    }
</script>

<svelte:head>
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/katex.min.css" integrity="sha384-GvrOXuhMATgEsSwCs4smul74iXGOixntILdUW9XmUC6+HX0sLNAK3q71HotJqlAn" crossorigin="anonymous">
</svelte:head>

<div class="flashcard-editor">
    <div class="editor-container">
        <!-- Question Side -->
        <div class="card-side question-side">
            <div class="side-header">
                <span class="side-label">Question</span>
                <div class="side-actions">
                    {#if !isEditingQuestion}
                        <button class="edit-btn" onclick={startEditingQuestion} title="Edit question">
                            <span class="material-symbols-outlined">edit</span>
                        </button>
                    {:else}
                        <button class="save-btn" onclick={saveQuestion} title="Save (Ctrl+Enter)">
                            <span class="material-symbols-outlined">check</span>
                        </button>
                        <button class="cancel-btn" onclick={cancelQuestion} title="Cancel (Esc)">
                            <span class="material-symbols-outlined">close</span>
                        </button>
                    {/if}
                </div>
            </div>
            
            <div class="card-content">
                {#if isEditingQuestion}
                    <textarea
                        bind:this={questionTextarea}
                        bind:value={questionText}
                        class="edit-textarea"
                        placeholder="Enter your question here... Use $math$ for inline math or ```math blocks for display math"
                        onkeydown={handleQuestionKeydown}
                        rows="6"
                    ></textarea>
                    <div class="edit-hint">
                        Press <kbd>Ctrl+Enter</kbd> to save, <kbd>Esc</kbd> to cancel
                    </div>
                {:else}
                    <div 
                        class="rendered-content question-content" 
                        onclick={startEditingQuestion}
                        role="button"
                        tabindex="0"
                        onkeydown={(e) => e.key === 'Enter' && startEditingQuestion()}
                    >
                        {#if questionText.trim()}
                            {@html questionHtml}
                        {:else}
                            <div class="placeholder">Click to add question...</div>
                        {/if}
                    </div>
                {/if}
            </div>
        </div>

        <!-- Answer Side -->
        <div class="card-side answer-side">
            <div class="side-header">
                <span class="side-label">Answer</span>
                <div class="side-actions">
                    {#if !isEditingAnswer}
                        <button class="edit-btn" onclick={startEditingAnswer} title="Edit answer">
                            <span class="material-symbols-outlined">edit</span>
                        </button>
                    {:else}
                        <button class="save-btn" onclick={saveAnswer} title="Save (Ctrl+Enter)">
                            <span class="material-symbols-outlined">check</span>
                        </button>
                        <button class="cancel-btn" onclick={cancelAnswer} title="Cancel (Esc)">
                            <span class="material-symbols-outlined">close</span>
                        </button>
                    {/if}
                </div>
            </div>
            
            <div class="card-content">
                {#if isEditingAnswer}
                    <textarea
                        bind:this={answerTextarea}
                        bind:value={answerText}
                        class="edit-textarea"
                        placeholder="Enter your answer here... Use $math$ for inline math or ```math blocks for display math"
                        onkeydown={handleAnswerKeydown}
                        rows="6"
                    ></textarea>
                    <div class="edit-hint">
                        Press <kbd>Ctrl+Enter</kbd> to save, <kbd>Esc</kbd> to cancel
                    </div>
                {:else}
                    <div 
                        class="rendered-content answer-content" 
                        onclick={startEditingAnswer}
                        role="button"
                        tabindex="0"
                        onkeydown={(e) => e.key === 'Enter' && startEditingAnswer()}
                    >
                        {#if answerText.trim()}
                            {@html answerHtml}
                        {:else}
                            <div class="placeholder">Click to add answer...</div>
                        {/if}
                    </div>
                {/if}
            </div>
        </div>
    </div>
</div>

<style>
    .flashcard-editor {
        background: white;
        border-radius: 12px;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
        border: 2px solid #e9ecef;
        margin-bottom: 2rem;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
    }

    .editor-container {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 1px;
        background: #e9ecef;
        border-radius: 10px;
        overflow: hidden;
    }

    @media (max-width: 768px) {
        .editor-container {
            grid-template-columns: 1fr;
        }
    }

    .card-side {
        background: white;
        display: flex;
        flex-direction: column;
        min-height: 300px;
    }

    .question-side {
        background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
    }

    .answer-side {
        background: linear-gradient(135deg, #fff9f0 0%, #fef3e2 100%);
    }

    .side-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 1rem 1.5rem 0.5rem;
        border-bottom: 1px solid rgba(0, 0, 0, 0.1);
    }

    .side-label {
        font-size: 0.85rem;
        font-weight: 600;
        color: #0ea5e9;
        text-transform: uppercase;
        letter-spacing: 0.8px;
    }

    .side-actions {
        display: flex;
        gap: 0.5rem;
    }

    .edit-btn, .save-btn, .cancel-btn {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 32px;
        height: 32px;
        border: none;
        border-radius: 6px;
        cursor: pointer;
        transition: all 0.2s ease;
        font-size: 18px;
    }

    .edit-btn {
        background: #f8f9fa;
        color: #6c757d;
        border: 1px solid #dee2e6;
    }

    .edit-btn:hover {
        background: #e9ecef;
        color: #495057;
    }

    .save-btn {
        background: #198754;
        color: white;
    }

    .save-btn:hover {
        background: #157347;
    }

    .cancel-btn {
        background: #6c757d;
        color: white;
    }

    .cancel-btn:hover {
        background: #5c636a;
    }

    .card-content {
        flex: 1;
        padding: 1.5rem;
        display: flex;
        flex-direction: column;
    }

    .rendered-content {
        flex: 1;
        cursor: pointer;
        padding: 1rem;
        border-radius: 8px;
        border: 2px dashed transparent;
        transition: all 0.2s ease;
        min-height: 100px;
        display: flex;
        align-items: center;
        justify-content: center;
    }

    .rendered-content:hover {
        border-color: #0ea5e9;
        background: rgba(14, 165, 233, 0.05);
    }

    .placeholder {
        color: #6c757d;
        font-style: italic;
        text-align: center;
    }

    .edit-textarea {
        flex: 1;
        width: 100%;
        max-width: 100%;
        padding: 1rem;
        border: 2px solid #0ea5e9;
        border-radius: 8px;
        font-size: 14px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
        resize: vertical;
        outline: none;
        background: white;
        box-sizing: border-box;
    }

    .edit-hint {
        margin-top: 0.5rem;
        font-size: 0.75rem;
        color: #6c757d;
        text-align: center;
    }

    .edit-hint kbd {
        background: #f8f9fa;
        border: 1px solid #dee2e6;
        border-radius: 3px;
        padding: 0.2rem 0.4rem;
        font-size: 0.7rem;
        font-family: monospace;
    }


    /* Typography for rendered content */
    .rendered-content :global(h1),
    .rendered-content :global(h2),
    .rendered-content :global(h3),
    .rendered-content :global(h4),
    .rendered-content :global(h5),
    .rendered-content :global(h6) {
        color: #2c2c2c;
        font-weight: 600;
        margin: 0.5rem 0;
    }

    .rendered-content :global(p) {
        margin: 0.75rem 0;
        line-height: 1.6;
        color: #2c2c2c;
    }

    .rendered-content :global(code) {
        background: #f8f9fa;
        padding: 0.2rem 0.4rem;
        border-radius: 3px;
        font-size: 0.9em;
        border: 1px solid #e9ecef;
    }

    .rendered-content :global(pre) {
        background: #f8f9fa;
        padding: 1rem;
        border-radius: 6px;
        border: 1px solid #e9ecef;
        overflow-x: auto;
        margin: 1rem 0;
    }

    .rendered-content :global(pre code) {
        background: none;
        padding: 0;
        border: none;
    }

    /* KaTeX styling */
    .rendered-content :global(.katex-display) {
        margin: 1rem 0;
        text-align: center;
    }

    .rendered-content :global(.katex) {
        font-size: 1.1em;
    }

    /* List styling */
    .rendered-content :global(ul),
    .rendered-content :global(ol) {
        padding-left: 1.5rem;
        margin: 0.75rem 0;
    }

    .rendered-content :global(li) {
        margin: 0.25rem 0;
        line-height: 1.5;
    }

    /* Blockquote styling */
    .rendered-content :global(blockquote) {
        border-left: 4px solid #0ea5e9;
        padding-left: 1rem;
        margin: 1rem 0;
        font-style: italic;
        color: #6c757d;
    }
</style>
