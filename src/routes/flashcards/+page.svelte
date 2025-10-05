<script>
    import { onMount } from 'svelte';
    import { page } from '$app/stores';
    import { goto } from '$app/navigation';
    import { FlashCardDeck } from '$lib/flashcards/flashcards.js';
    import FlashCard from '$lib/flashcards/FlashCard.svelte';
    import Haikunator from 'haikunator';

    let currentCard = $state(null);
    let error = $state(null);
    let isLoading = $state(false);
    
    // Deck name editing state
    let isEditingName = $state(false);
    let editingNameValue = $state('');
    let nameInputElement = $state();
    
    let deckNameInput = $state('');
    let deckNameInputElement = $state();

    // Get slug from URL params
    let slug = $derived($page.url.searchParams.get('deck'));
    let deck = null;
    
    async function createNewDeck() {
        try {
            isLoading = true;
            const haikunator = new Haikunator();
            const newSlug = haikunator.haikunate({ tokenLength: 0 });
            await goto(`/flashcards?deck=${encodeURIComponent(newSlug)}`);
        } catch (err) {
            console.error('Failed to create deck:', err);
            error = err.message;
        } finally {
            isLoading = false;
        }
    }

    async function openDeckByName() {
        const deckName = deckNameInput.trim();
        if (!deckName) {
            deckNameInputElement?.focus();
            return;
        }
        
        try {
            isLoading = true;
            // Convert to URL-friendly slug (replace spaces with hyphens, lowercase)
            const slug = deckName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
            await goto(`/flashcards?deck=${encodeURIComponent(slug)}`);
        } catch (err) {
            console.error('Failed to open deck:', err);
            error = err.message;
        } finally {
            isLoading = false;
        }
    }

    function handleDeckNameKeydown(event) {
        if (event.key === 'Enter') {
            event.preventDefault();
            openDeckByName();
        }
    }

    async function loadDeck(deckSlug) {
        if (!deckSlug || (deck && deck.slug === deckSlug)) return;
        
        try {
            isLoading = true;
            error = null;

            deck = await FlashCardDeck.create(deckSlug, "none"); // Using "none" as user for now

            // Get first card for study
            const studyCards = deck.getCardsForStudy(1);
            currentCard = studyCards.length > 0 ? studyCards[0] : null;
            
        } catch (err) {
            console.error('Failed to load deck:', err);
            error = err.message;
            deck = null;
        } finally {
            isLoading = false;
        }
    }

    function handleCardScore(event) {
        const { cardId, score } = event.detail;
        console.log(`Card ${cardId} scored: ${score}`);
        
        if (deck) {
            deck.reviewCard(cardId, score);
            // Get next card
            const studyCards = deck.getCardsForStudy(1);
            currentCard = studyCards.length > 0 ? studyCards[0] : null;
        }
    }

    function startEditingName() {
        if (deck?.isSandbox) return;
        isEditingName = true;
        editingNameValue = deck?.slug || '';
        setTimeout(() => nameInputElement?.focus(), 0);
    }

    function cancelEditingName() {
        isEditingName = false;
        editingNameValue = '';
    }

    function saveNewName() {
        // TODO: Implement deck renaming
        console.log('Rename deck to:', editingNameValue);
        isEditingName = false;
    }

    // Load deck when slug changes
    $effect(() => {
        if (slug) {
            loadDeck(slug);
        }
    });
</script>

<svelte:head>
    <title>CODYX - Interactive Flashcards</title>
    <link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;500;600;700;800;900&family=Bowlby+One&display=swap" rel="preload" as="style">
    <link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;500;600;700;800;900&family=Bowlby+One&display=swap" rel="stylesheet">
    <link href="https://fonts.googleapis.com/icon?family=Material+Symbols+Outlined" rel="stylesheet">
</svelte:head>


<div class="app-container">
    <main class="main-content">
        <div class="flashcard-container">
            {#if error}
            <div class="error-banner">
                <span class="material-symbols-outlined">error</span>
                {error}
            </div>
            {/if}

            {#if isLoading}
                <div class="loading-container">
                    <div class="loading-spinner">
                        <span class="material-symbols-outlined spinning">progress_activity</span>
                    </div>
                    <p>Loading flashcard deck...</p>
                </div>
            {/if}

            <div class="deck-input-section">
                <div class="deck-info">
                    <div class="deck-container">
                        <span class="deck-label">Deck Name:</span>
                        <input 
                            id="deck-name"
                            type="text" 
                            bind:value={deckNameInput}
                            bind:this={deckNameInputElement}
                            class="deck-name-input"
                            placeholder="my-flashcard-deck"
                            onkeydown={handleDeckNameKeydown}
                            disabled={isLoading}
                        />
                        <button 
                            class="open-deck-btn" 
                            onclick={openDeckByName}
                            disabled={isLoading || !deckNameInput.trim()}
                        >
                            <span class="material-symbols-outlined">folder_open</span>
                            Open Deck
                        </button>
                        <button class="create-new-btn" onclick={createNewDeck} disabled={isLoading}>
                            <span class="material-symbols-outlined">add</span>
                            Create New Deck
                        </button>
                        <button class="import-btn" disabled={isLoading}>
                            <span class="material-symbols-outlined">place_item</span>
                            Import
                        </button>
                    </div>
                </div>
            </div>

            {#if !deck}
                <div class="flashcard-area">
                    <FlashCard 
                        card={{
                            id: 'sample',
                            question: 'What is spaced repetition?',
                            answer: 'A learning technique that involves reviewing information at increasing intervals to improve long-term retention and memory.'
                        }}
                        onscore={() => {}}
                    />
                </div>
            {/if}

            {#if deck}
            
            {#if deck.isSandbox}
                <div class="sandbox-banner">
                    🏖️ Sandbox Mode - Changes won't be saved
                </div>
            {/if}

            <div class="deck-info">
                <div class="deck-container">
                    <div class="deck-name-section">
                        {#if isEditingName}
                        <div class="deck-editing-container">
                            <input 
                                type="text" 
                                bind:value={editingNameValue}
                                bind:this={nameInputElement}
                                class="deck-name-input"
                                onkeydown={(e) => {
                                    if (e.key === 'Enter') saveNewName();
                                    if (e.key === 'Escape') cancelEditingName();
                                }}
                            />
                            <button class="save-name-btn" onclick={saveNewName}>
                                <span class="material-symbols-outlined">check</span>
                            </button>
                            <button class="cancel-name-btn" onclick={cancelEditingName}>
                                <span class="material-symbols-outlined">close</span>
                            </button>
                        </div>
                        {:else}
                        <button 
                            class="deck-name" 
                            onclick={startEditingName}
                            disabled={deck.isSandbox}
                            type="button"
                        >
                            <span class="deck-title">Deck: {deck.slug}</span>
                            {#if !deck.isSandbox}
                            <span class="material-symbols-outlined edit-icon">edit</span>
                            {/if}
                        </button>
                        {/if}
                    </div>

                    <!-- Sandbox URL Display -->
                    {#if !deck.isSandbox && deck.sandbox_slug}
                    <div class="view-info">
                        <div class="view-label">
                            <span class="material-symbols-outlined">visibility</span>
                            View-only link:
                        </div>
                        <div class="view-url-container">
                            <span class="view-url-text">{deck.getSandboxUrl()}</span>
                            <button 
                                class="view-copy-btn"
                                onclick={() => navigator.clipboard.writeText(window.location.origin + deck.getSandboxUrl())}
                            >
                                <span class="material-symbols-outlined">content_copy</span>
                            </button>
                        </div>
                    </div>
                    {/if}
                </div>
            </div>

            <!-- Flashcard Display -->
            <div class="flashcard-area">
                {#if currentCard}
                <FlashCard 
                    card={currentCard} 
                    onscore={handleCardScore}
                />
                {:else}
                <div class="no-cards">
                    <div class="no-cards-icon">
                        <span class="material-symbols-outlined">quiz</span>
                    </div>
                    <h3>No cards to study!</h3>
                    <p>Add some flashcards to get started with spaced repetition learning.</p>
                    <button class="add-card-btn">
                        <span class="material-symbols-outlined">add</span>
                        Add First Card
                    </button>
                </div>
                {/if}
            </div>
            {/if}
        </div>
    </main>
</div>

<style>
    @import url('https://fonts.googleapis.com/css2?family=Raleway:ital,wght@0,300;0,400;0,500;0,600;1,400&display=swap');
    
    :global(body) {
        margin: 0;
        padding: 0;
        font-family: 'Raleway', sans-serif;
        background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
        min-height: 100vh;
    }

    .app-container {
        min-height: 100vh;
        display: flex;
        flex-direction: column;
    }
    .main-content {
        flex: 1;
        display: flex;
        justify-content: center;
        padding: 2rem 1rem;
    }

    .flashcard-container {
        padding: 20px 20px;
        max-width: 900px;
        margin: auto;
        margin-top: 20px;
        display: flex;
        min-height: 100vh;
        display: flex;
        flex-direction: column;
        border: 1px solid #e5e7eb;
        background: white;
        border-radius: 16px;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);

    }

    .main-content {
        padding: 1rem;
    }

    /* Sandbox Banner */
    .sandbox-banner {
        background: linear-gradient(135deg, #ff8c00, #ffb74d);
        color: white;
        text-align: center;
        padding: 1rem 1.25rem;
        margin: 0 0 2rem 0;
        border-radius: 8px;
        font-family: 'Raleway', sans-serif;
        font-size: 15px;
        font-weight: 600;
        box-shadow: 0 2px 8px rgba(255, 140, 0, 0.2);
    }

    /* Deck Info */
    .deck-info {
        margin-bottom: 2rem;
    }

    .deck-container {
        display: flex;
        flex-direction: column;
        gap: 1rem;
        padding: 1.5rem;
        background: white;
        border: 1px solid #e9ecef;
        border-radius: 8px;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
    }

    .deck-name {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        cursor: pointer;
        padding: 0.5rem;
        border-radius: 4px;
        transition: background-color 0.2s;
        border: none;
        background: transparent;
        width: fit-content;
    }

    .deck-name:hover:not(:disabled) {
        background: #f8f9fa;
    }

    .deck-name:disabled {
        cursor: default;
    }

    .deck-title {
        font-size: 1.2rem;
        font-weight: 600;
        color: #2c2c2c;
    }

    .edit-icon {
        font-size: 18px;
        color: #6c757d;
    }

    .deck-editing-container {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        flex-wrap: wrap;
    }

    .deck-name-input {
        flex: 1;
        min-width: 200px;
        padding: 0.5rem;
        border: 2px solid #0ea5e9;
        border-radius: 4px;
        font-size: 1.1rem;
        font-family: 'Raleway', sans-serif;
        outline: none;
    }

    .save-name-btn, .cancel-name-btn {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 32px;
        height: 32px;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        transition: all 0.2s ease;
    }

    .save-name-btn {
        background: #0ea5e9;
        color: white;
    }

    .cancel-name-btn {
        background: #f8f9fa;
        color: #666;
        border: 1px solid #dee2e6;
    }

    .view-info {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
    }

    .view-label {
        display: flex;
        align-items: center;
        gap: 0.3rem;
        font-size: 11px;
        font-weight: 500;
        color: #6c757d;
    }

    .view-url-container {
        display: flex;
        align-items: center;
        gap: 0.4rem;
    }

    .view-url-text {
        font-family: 'Monaco', 'Consolas', monospace;
        font-size: 10px;
        color: #495057;
        background: white;
        border: 1px solid #dee2e6;
        border-radius: 3px;
        padding: 0.25rem 0.4rem;
        flex: 1;
    }

    .view-copy-btn {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 24px;
        height: 24px;
        background: #f8f9fa;
        border: 1px solid #dee2e6;
        border-radius: 3px;
        cursor: pointer;
        transition: all 0.2s ease;
    }

    .view-copy-btn:hover {
        background: #e9ecef;
    }

    /* Flashcard Area */
    .flashcard-area {
        min-width: 800px;   
        max-width: 800px;
        margin: 0 auto;
    }

    /* States */
    .loading-container, .no-cards {
        text-align: center;
        padding: 4rem 2rem;
        color: #6c757d;
    }

    .loading-spinner, .no-cards-icon {
        margin-bottom: 1.5rem;
    }

    .loading-spinner .material-symbols-outlined,
    .no-cards-icon .material-symbols-outlined {
        font-size: 64px;
        color: #0ea5e9;
    }

    .spinning {
        animation: spin 2s linear infinite;
    }

    @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
    }

    .no-cards h3 {
        color: #2c2c2c;
        margin-bottom: 1rem;
    }

    .add-card-btn {
        display: inline-flex;
        align-items: center;
        gap: 0.5rem;
        background: #0ea5e9;
        color: white;
        border: none;
        padding: 1rem 2rem;
        border-radius: 8px;
        font-family: 'Raleway', sans-serif;
        font-size: 1rem;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s ease;
        margin-top: 1rem;
    }

    .deck-input-section {
        margin-bottom:32px;
        width: 100%;
        box-sizing: border-box;
    }

    .deck-info {
        display: flex;
        flex-direction: column;
        align-items: flex-start;
        gap: 1rem;
        width: 100%;
        box-sizing: border-box;
    }

    .deck-container {
        display: flex;
        flex-direction: row;
        align-items: center;
        justify-content: flex-start;
        gap: 1rem;
        padding: 0.75rem 1rem;
        background: #f8f9fa;
        border: 1px solid #e9ecef;
        border-radius: 8px;
        width: 100%;
        max-width: 100%;
        transition: all 0.2s ease;
        flex-wrap: nowrap;
        box-sizing: border-box;
    }

    .deck-container:hover {
        background: #f1f3f4;
        border-color: #dee2e6;
    }

    .deck-label {
        color: #666;
        font-family: 'Raleway', sans-serif;
        font-size: 14px;
        font-weight: 500;
        white-space: nowrap;
        flex-shrink: 0;
        display: inline-block;
    }

    .deck-name-input {
        padding: 0.375rem 0.5rem;
        border: 1px solid #dee2e6;
        border-radius: 4px;
        font-size: 14px;
        font-family: 'Raleway', sans-serif;
        transition: border-color 0.2s ease;
        background: white;
        width: 200px;
        flex-shrink: 0;
    }

    .deck-name-input:focus {
        outline: none;
        border-color: #ffa000;
    }

    .deck-name-input:disabled {
        background: #f9fafb;
        color: #9ca3af;
        cursor: not-allowed;
    }

    .open-deck-btn {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 0.5rem;
        padding: 0.5rem 1rem;
        background: #0ea5e9;
        color: white;
        border: none;
        border-radius: 6px;
        font-size: 0.85rem;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s ease;
        white-space: nowrap;
    }

    .open-deck-btn:hover:not(:disabled) {
        background: #0284c7;
        transform: translateY(-1px);
    }

    .open-deck-btn:disabled {
        opacity: 0.7;
        cursor: not-allowed;
        transform: none;
    }

    .create-new-btn {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 0.5rem;
        padding: 0.5rem 1rem;
        background: #0ea5e9;
        color: white;
        border: none;
        border-radius: 6px;
        font-size: 0.85rem;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s ease;
        white-space: nowrap;
    }

    .create-new-btn:hover:not(:disabled) {
        background: #0284c7;
        transform: translateY(-1px);
    }

    .create-new-btn:disabled {
        opacity: 0.7;
        cursor: not-allowed;
        transform: none;
    }
    

    .import-btn {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.5rem 1rem;
        background: #ffa000;
        color: white;
        border: none;
        border-radius: 6px;
        font-size: 0.85rem;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s ease;
        white-space: nowrap;
    }

    .import-btn:hover:not(:disabled) {
        background: #e6900a;
        transform: translateY(-1px);
    }

    .import-btn:disabled {
        opacity: 0.7;
        cursor: not-allowed;
        transform: none;
    }



    .create-deck-btn:hover, .add-card-btn:hover {
        background: #0284c7;
        transform: translateY(-2px);
    }

    .error-banner {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        background: #fee;
        color: #d63384;
        padding: 1rem;
        border-radius: 8px;
        margin-bottom: 1rem;
        border: 1px solid #f5c6cb;
    }

    /* Responsive */
    @media (max-width: 768px) {
        .app-header {
            padding: 1rem;
        }

        .header-content {
            flex-direction: column;
            gap: 1rem;
            align-items: stretch;
        }

        .main-content {
            padding: 1rem;
        }

        .deck-container {
            padding: 1rem;
        }
    }
</style>