<script>
    import FlashCard from '$lib/flashcards/FlashCard.svelte';
    import FlashcardEditor from '$lib/flashcards/FlashcardEditor.svelte';
    import CodyxCell from '$lib/components/CodyxCell.svelte';
    
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
    
    let currentIndex = $state(0);
    let showAnswer = $state(false);
    
    function handleScore(event) {
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

    // CodyxCell renderer test data
    let testMarkdownCell = $state({
        id: 'test-cell-md',
        type: 'markdown',
        text: '# Renderer Architecture Test\n\nThis is a **Markdown cell** using the new renderer architecture!\n\n- Clean separation of concerns ✅\n- Modular renderer classes ✅\n- LiveText integration ✅\n\nClick **Execute** to toggle preview mode, or edit this content to test the new architecture.\n\n## Features Demonstrated\n\n1. **Container Logic**: CodyxCell handles gutter, toolbar, lifecycle\n2. **Content Logic**: MarkdownRenderer handles markdown-specific behavior\n3. **Interface Compliance**: All renderers implement the same interface'
    });

    let testRCell = $state({
        id: 'test-cell-r',
        type: 'r',
        text: '# R Cell Demo\ndata <- data.frame(\n  Name = c("Alice", "Bob", "Charlie"),\n  Age = c(25, 30, 22),\n  Score = c(95.5, 87.2, 92.8)\n)\nhead(data)'
    });

    function handleEditorSave(updatedCard) {
        editorCard = { ...updatedCard };
    }

    function handleEditorDelete(card) {
        editorCard = { id: 'editor-sample', question: '', answer: '' };
    }

    // CodyxCell renderer test handlers
    function handleCellTextChange(event) {
        if (event.detail.cellId === 'test-cell-md') {
            testMarkdownCell.text = event.detail.text;
        } else if (event.detail.cellId === 'test-cell-r') {
            testRCell.text = event.detail.text;
        }
    }

    function handleCellExecute(event) {
        return; // No-op for now
    }

    function handleCellDelete(event) {
        return;
        // In a real app, this would remove the cell from the notebook
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

        <section class="component-section">
            <h2>🚧 CodyxCell Renderer Architecture (Testing)</h2>
            <p class="section-description">
                Testing the new renderer architecture with separated concerns. Currently supports Markdown cells (edit/preview) and R cells (code execution with mock outputs).
            </p>
            <CodyxCell 
                initialText={testMarkdownCell.text}
                type={testMarkdownCell.type}
                docId={testMarkdownCell.id}
                cellIndex={0}
                onTextChange={handleCellTextChange}
                onExecute={handleCellExecute}
                onDelete={handleCellDelete}
            />
            
            <CodyxCell 
                initialText={testRCell.text}
                type={testRCell.type}
                docId={testRCell.id}
                cellIndex={1}
                onTextChange={handleCellTextChange}
                onExecute={handleCellExecute}
                onDelete={handleCellDelete}
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