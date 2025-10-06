<script>
    import { createEventDispatcher } from 'svelte';
    import { marked } from 'marked';
    import katex from 'katex';

    let props = $props();
    let card = props.card ?? null;
    let showAnswer = props.showAnswer ?? false;
    const dispatch = createEventDispatcher();
    let isFlipped = $state(false);
    
    function flipCard() {
        if (!showAnswer) {
            isFlipped = !isFlipped;
        }
    }
    
    function handleScore(score) {
        dispatch('score', { cardId: card.id, score });
        isFlipped = false; // Reset for next card
    }
    
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
        
        try {
            // First process inline math
            let processed = processInlineMath(text);
            
            // Then process markdown with custom renderer
            return marked(processed, { renderer });
        } catch (e) {
            console.warn('Error parsing markdown:', e);
            return text;
        }
    }
    
    // Parse markdown for question and answer with KaTeX support
    let questionHtml = $derived(card?.question ? parseMarkdown(card.question) : '');
    let answerHtml = $derived(card?.answer ? parseMarkdown(card.answer) : '');
</script>

<svelte:head>
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/katex.min.css" integrity="sha384-GvrOXuhMATgEsSwCs4smul74iXGOixntILdUW9XmUC6+HX0sLNAK3q71HotJqlAn" crossorigin="anonymous">
</svelte:head>

{#if card}
<div class="flashcard-container">
    <div 
        class="flashcard" 
        class:flipped={isFlipped || showAnswer} 
        onclick={flipCard}
        onkeydown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                flipCard();
            }
        }}
        role="button"
        tabindex="0"
        aria-label={isFlipped || showAnswer ? 'Card showing answer' : 'Click to reveal answer'}
    >
        <div class="card-face card-front">
            <div class="card-content">
                <div class="question-label">Question</div>
                <div class="question-text">
                    {@html questionHtml}
                </div>
                {#if !showAnswer}
                <div class="flip-hint">Press Enter or Space to reveal answer</div>
                {/if}
            </div>
        </div>
        
        <div class="card-face card-back">
            <div class="card-content">
                <div class="question-reminder">
                    {@html questionHtml}
                </div>
                <div class="answer-divider"></div>
                <div class="answer-label">Answer</div>
                <div class="answer-text">
                    {@html answerHtml}
                </div>
            </div>
        </div>
    </div>
    
    {#if isFlipped || showAnswer}
    <div class="scoring-buttons">
        <div class="scoring-row">
            <div class="scoring-header">How well did you know this?</div>
            <div class="buttons-group">
                <button class="score-btn score-again" onclick={() => handleScore(5)}>
                    <span class="score-label">Nope</span>
                </button>
                <button class="score-btn score-good" onclick={() => handleScore(3)}>
                    <span class="score-label">Sorta</span>
                </button>
                <button class="score-btn score-easy" onclick={() => handleScore(1)}>
                    <span class="score-label">Got It!</span>
                </button>
            </div>
        </div>
    </div>
    {/if}
</div>
{/if}

<style>
    /* Use same font stack as notebooks */
    .flashcard-container {
        max-width: 600px;
        margin: 0 auto;
        perspective: 1000px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
    }
    
    .flashcard {
        position: relative;
        width: 100%;
        min-height: 400px; /* Increased height */
        cursor: pointer;
        transform-style: preserve-3d;
        transition: transform 0.6s ease;
        margin-bottom: 2rem;
    }
    
    .flashcard.flipped {
        transform: rotateY(180deg);
    }
    
    .card-face {
        position: absolute;
        width: 100%;
        min-height: 400px; /* Increased height */
        backface-visibility: hidden;
        border-radius: 12px;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
        border: 2px solid #e9ecef;
        background: white;
    }
    
    .card-front {
        background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
    }
    
    .card-back {
        transform: rotateY(180deg);
        background: linear-gradient(135deg, #fff9f0 0%, #fef3e2 100%); /* Subtle orange tint */
    }
    
    .card-content {
        padding: 2.5rem;
        height: 100%;
        display: flex;
        flex-direction: column;
        justify-content: center;
    }
    
    .question-label, .answer-label {
        font-size: 0.85rem;
        font-weight: 600;
        color: #0ea5e9; /* Brand blue instead of #6c757d */
        text-transform: uppercase;
        letter-spacing: 0.8px;
        margin-bottom: 1.5rem;
    }
    
    .question-text {
        font-size: 1.3rem;
        line-height: 1.5;
        color: #2c2c2c;
        font-weight: 400;
        flex-grow: 1;
        display: flex;
        align-items: center;
        justify-content: center;
        text-align: center;
    }
    
    .question-reminder {
        font-size: 1rem; /* Smaller than main question */
        color: #666;
        line-height: 1.4;
        margin-bottom: 1rem;
        font-weight: 400;
    }
    
    .answer-divider {
        height: 3px;
        background: linear-gradient(90deg, transparent, #ff8c00, transparent); /* Brand orange */
        margin: 1.5rem 0 2rem 0; /* Moved up with more space below */
        border-radius: 2px;
    }
    
    .answer-text {
        font-size: 1.1rem; /* Smaller than question */
        line-height: 1.5;
        color: #2c2c2c;
        font-weight: 400;
        flex-grow: 1;
        display: flex;
        align-items: flex-start; /* Align to top instead of center */
        justify-content: flex-start;
        text-align: left;
    }
    
    .flip-hint {
        position: absolute;
        bottom: 1.5rem;
        left: 50%;
        transform: translateX(-50%);
        font-size: 0.8rem;
        color: #6c757d;
        font-style: italic;
    }
    
    .scoring-buttons {
        background: #f8f9fa;
        border-radius: 8px;
        padding: 0.75rem 1rem;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
        border: 1px solid #e9ecef;
        margin-top: 1rem;
    }
    
    .scoring-row {
        display: flex;
        align-items: center;
        gap: 1.5rem;
        justify-content: center;
    }
    
    .scoring-header {
        font-size: 0.85rem;
        font-weight: 500;
        color: #6c757d;
        white-space: nowrap;
        flex-shrink: 0;
    }
    
    .buttons-group {
        display: flex;
        gap: 0.75rem;
        align-items: center;
    }
    
    .score-btn {
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 0.6rem 1.2rem;
        border: none;
        border-radius: 6px;
        cursor: pointer;
        transition: all 0.15s ease;
        min-width: 80px;
        color: white;
        font-weight: 500;
    }
    
    .score-label {
        font-size: 0.85rem;
        font-weight: 500;
    }
    
    /* Brand colors for score buttons */
    .score-again {
        background: #dc3545; /* Red */
    }
    
    .score-good {
        background: #ff8c00; /* Brand Orange */
    }
    
    .score-easy {
        background: #0ea5e9; /* Brand Blue */
    }
    
    .score-btn:hover {
        transform: translateY(-1px);
        box-shadow: 0 3px 8px rgba(0, 0, 0, 0.2);
        opacity: 0.9;
    }
    
    /* Responsive design */
    @media (max-width: 640px) {
        .card-content {
            padding: 2rem;
        }
        
        .question-text {
            font-size: 1.2rem;
        }
        
        .answer-text {
            font-size: 1rem;
        }
        
        .scoring-row {
            flex-direction: column;
            align-items: flex-start;
            gap: 0.75rem;
        }
        
        .buttons-group {
            justify-content: stretch;
            width: 100%;
        }
        
        .score-btn {
            min-width: auto;
            padding: 0.75rem 1rem;
            flex: 1;
        }
        
        .score-label {
            font-size: 0.8rem;
        }
    }
    
    /* Typography consistency with notebooks */
    .card-content :global(h1),
    .card-content :global(h2),
    .card-content :global(h3),
    .card-content :global(h4),
    .card-content :global(h5),
    .card-content :global(h6) {
        color: #2c2c2c;
        font-weight: 600;
        margin: 0.5rem 0;
    }
    
    .card-content :global(p) {
        margin: 0.75rem 0;
        line-height: 1.6;
    }
    
    .card-content :global(code) {
        background: #f8f9fa;
        padding: 0.2rem 0.4rem;
        border-radius: 3px;
        font-family: 'Monaco', 'Consolas', monospace;
        font-size: 0.9em;
        color: #d63384;
    }
    
    .card-content :global(pre) {
        background: #f8f9fa;
        padding: 1rem;
        border-radius: 6px;
        overflow-x: auto;
        border-left: 4px solid #ff8c00; /* Brand orange accent */
    }
</style>