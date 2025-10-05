<script>
    import FlashCard from '$lib/flashcards/FlashCard.svelte';
    import FlashcardEditor from '$lib/flashcards/FlashcardEditor.svelte';
    
    let sampleCards = [
        {
            id: '1',
            question: '**What is the capital of France?**',
            answer: 'Paris is the capital and largest city of France, located in the north-central part of the country.'
        },
        {
            id: '2', 
            question: 'Explain the concept of **spaced repetition**',
            answer: `Spaced repetition is a learning technique that involves:

- Reviewing information at increasing intervals
- Focusing more on difficult material  
- Optimizing long-term retention
- Based on the forgetting curve research`
        },
        {
            id: '3',
            question: 'Short question?',
            answer: 'Short answer!'
        }
    ];
    
    let currentIndex = 0;
    let showAnswer = false;
    
    function handleScore(event) {
        console.log('Card scored:', event.detail);
        // Move to next card
        currentIndex = (currentIndex + 1) % sampleCards.length;
    }
    
    function nextCard() {
        currentIndex = (currentIndex + 1) % sampleCards.length;
    }
    
    function prevCard() {
        currentIndex = currentIndex === 0 ? sampleCards.length - 1 : currentIndex - 1;
    }

    // Editor functionality
    let editorCard = $state({
        id: 'editor-sample',
        question: '**What is the quadratic formula?**\n\nSolve for x: $ax^2 + bx + c = 0$',
        answer: 'The quadratic formula is:\n\n```math\nx = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}\n```\n\nWhere:\n- $a$, $b$, and $c$ are coefficients\n- $a \\neq 0$'
    });

    function handleEditorSave(updatedCard) {
        console.log('Card saved:', updatedCard);
        editorCard = { ...updatedCard };
    }

    function handleEditorDelete(card) {
        console.log('Card deleted:', card);
        // Reset to empty card
        editorCard = { id: 'editor-sample', question: '', answer: '' };
    }
</script>

<svelte:head>
    <title>FlashCard Components Preview</title>
</svelte:head>

<div class="preview-container">
    <header class="preview-header">
        <h1>FlashCard Components Preview</h1>
        <div class="controls">
            <button onclick={prevCard}>← Previous</button>
            <span>Card {currentIndex + 1} of {sampleCards.length}</span>
            <button onclick={nextCard}>Next →</button>
        </div>
        <label>
            <input type="checkbox" bind:checked={showAnswer}>
            Always show answer
        </label>
    </header>
    
    <main class="preview-main">
        <section class="component-section">
            <h2>FlashCard Component (Study Mode)</h2>
            <FlashCard 
                card={sampleCards[currentIndex]} 
                {showAnswer}
                onscore={handleScore}
            />
        </section>

        <section class="component-section">
            <h2>FlashcardEditor Component (Edit Mode)</h2>
            <p class="section-description">
                Click on the question or answer areas to edit. Supports markdown and KaTeX math ($inline$ and ```math blocks).
            </p>
            <FlashcardEditor 
                card={editorCard}
                onSave={handleEditorSave}
                onDelete={handleEditorDelete}
            />
        </section>
    </main>
</div>

<style>
    .preview-container {
        max-width: 800px;
        margin: 0 auto;
        padding: 2rem;
        font-family: 'Raleway', sans-serif;
    }
    
    .preview-header {
        text-align: center;
        margin-bottom: 3rem;
    }
    
    .preview-header h1 {
        color: #333;
        margin-bottom: 1.5rem;
    }
    
    .controls {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 1rem;
        margin-bottom: 1rem;
    }
    
    .controls button {
        padding: 0.5rem 1rem;
        border: 1px solid #ddd;
        background: white;
        border-radius: 4px;
        cursor: pointer;
        transition: background-color 0.2s;
    }
    
    .controls button:hover {
        background: #f8f9fa;
    }
    
    .controls span {
        font-weight: 500;
        color: #666;
    }
    
    .preview-main {
        display: flex;
        flex-direction: column;
        gap: 4rem;
    }

    .component-section {
        background: #f8f9fa;
        padding: 2rem;
        border-radius: 12px;
        border: 1px solid #e9ecef;
    }

    .component-section h2 {
        color: #495057;
        margin-bottom: 1rem;
        padding-bottom: 0.5rem;
        border-bottom: 2px solid #0ea5e9;
        font-size: 1.5rem;
    }

    .section-description {
        color: #6c757d;
        font-size: 0.9rem;
        margin-bottom: 1.5rem;
        padding: 0.75rem;
        background: #fff;
        border-left: 4px solid #ffa000;
        border-radius: 4px;
    }
</style>