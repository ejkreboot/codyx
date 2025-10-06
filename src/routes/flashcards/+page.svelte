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
    let isSandbox = $state(false);
    
    // Deck name editing state
    let isEditingName = $state(false);
    let editingNameValue = $state('');
    let nameInputElement = $state();
    
    let deckNameInput = $state('');
    let deckNameInputElement = $state();

    // Get slug from URL params
    let slug = $derived($page.url.searchParams.get('deck'));
    let deck = $state(null);

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
        if (!deckSlug) return;
        
        if (deck && (deck.slug === deckSlug || deck.sandbox_slug === deckSlug)) {
            return;
        }
        
        try {
            isLoading = true;
            error = null;

            deck = await FlashCardDeck.create(deckSlug, "none"); // Using "none" as user for now

            // Update the deck name input to show current deck
            deckNameInput = deck.slug;
            isSandbox = deck.isSandbox;

            // Get first card for study
            const studyCards = deck.getCardsForStudy(20);
            currentCard = studyCards.length > 0 ? studyCards[0] : null;
            console.log(deck);
        } catch (err) {
            console.error('Failed to load deck:', err);
            error = err.message;
            deck = null;
        } finally {
            isLoading = false;
        }
    }

    async function handleCardScore(event) {
        const { cardId, score } = event.detail;
        if (deck) {
            await deck.reviewCard(cardId, score);
            let next = deck.getNextCardForStudy(currentCard.id);
            currentCard = next;
        }
    }

    function startEditingName() {
        if (isSandbox) return;
        isEditingName = true;
        editingNameValue = deck?.slug || '';
        setTimeout(() => nameInputElement?.focus(), 0);
    }

    function cancelEditingName() {
        isEditingName = false;
        editingNameValue = '';
    }

    async function saveNewName() {
        if (!deck || isSandbox) return;
        
        const newSlug = editingNameValue.trim();
        if (!newSlug || newSlug === deck.slug) {
            isEditingName = false;
            return;
        }

        try {
            // Check if the new slug is available
            const isAvailable = await deck.isSlugAvailable(newSlug);
            if (!isAvailable) {
                error = `Deck name "${newSlug}" is already taken`;
                return;
            }

            // Update the deck slug
            await deck.updateDeck(deck.deckId, { slug: newSlug });
            
            // Update local state
            deck.slug = newSlug;
            deckNameInput = newSlug;
            
            // Navigate to the new URL
            await goto(`/flashcards?deck=${encodeURIComponent(newSlug)}`);
            
            isEditingName = false;
        } catch (err) {
            console.error('Failed to rename deck:', err);
            error = err.message;
        }
    }

    function handleNameKeydown(event) {
        if (event.key === 'Enter') {
            event.preventDefault();
            saveNewName();
        } else if (event.key === 'Escape') {
            event.preventDefault();
            cancelEditingName();
        }
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
    <link href="/src/assets/codyx-style.css" rel="stylesheet">
</svelte:head>


<div class="app-container">
    <main class="main-content">
        <div class="main-container">
            {#if error}
            <div class="message message--error">
                <span class="material-symbols-outlined">error</span>
                {error}
            </div>
            {/if}

            {#if isLoading}
                <div class="loading">
                    <div class="loading__spinner">
                        <span class="material-symbols-outlined loading__spinner--spinning">progress_activity</span>
                    </div>
                    <p>Loading flashcard deck...</p>
                </div>
            {/if}

            <div class="content-info">
                {#if deck}
                    <span class="content-info__label">Deck:</span>
                    {#if isEditingName}
                        <input 
                            type="text" 
                            bind:value={editingNameValue}
                            bind:this={nameInputElement}
                            class="content-info__editor"
                            onkeydown={handleNameKeydown}
                            onblur={saveNewName}
                        />
                        <button class="btn primary small icon-only" onclick={saveNewName}>
                            <span class="material-symbols-outlined">check</span>
                        </button>
                        <button class="btn tertiary small icon-only" onclick={cancelEditingName}>
                            <span class="material-symbols-outlined">close</span>
                        </button>
                    {:else}
                        <div class="content-info__name-display" class:content-info__name-display--editable={!isSandbox}>
                            <span class="content-info__name-text">{deck.slug}</span>
                            {#if !isSandbox}
                                <button class="btn tertiary small icon-only transparent" onclick={startEditingName}>
                                    <span class="material-symbols-outlined">edit</span>
                                </button>
                            {/if}
                        </div>
                        {#if !isSandbox}
                        <div class="content-info__actions">
                            <button class="btn primary" disabled={isLoading} onclick={async () => {
                                try {
                                    await goto(`/flashcards/edit?deck=${encodeURIComponent(deck.slug)}`);
                                } catch (err) {
                                    console.error('Navigation error:', err);
                                }
                            }}>
                                <span class="material-symbols-outlined">edit</span>
                                Edit Deck
                            </button>
                        </div>
                        {/if}
                    {/if}
                {:else}
                    <!-- Initial deck input form -->
                    <div class="content-info">
                        <span class="form__label-text">Deck Name:</span>
                        <input 
                            id="deck-name"
                            type="text" 
                            bind:value={deckNameInput}
                            bind:this={deckNameInputElement}
                            class="form__input"
                            placeholder="my-flashcard-deck"
                            onkeydown={handleDeckNameKeydown}
                            disabled={isLoading}
                        />
                        <div class="content-info__actions">
                            <button 
                                class="btn secondary" 
                                onclick={openDeckByName}
                                disabled={isLoading || !deckNameInput.trim()}
                            >
                                <span class="material-symbols-outlined">folder_open</span>
                                Open Deck
                            </button>
                            <button class="btn secondary" onclick={createNewDeck} disabled={isLoading}>
                                <span class="material-symbols-outlined">add</span>
                                Create New Deck
                            </button>
                        </div>
                    </div>
                {/if}

                <!-- View-only link (shown when deck is loaded and not in sandbox) -->
                {#if deck && !isSandbox && deck.sandbox_slug}
                <div class="content-info__section">
                    <div class="text-sm">
                        <span class="text-sm material-symbols-outlined">visibility</span>
                        View-only link:
                    </div>
                    <div class="content-info__url-container">
                        <span class="content-info__url-text">{window.location.origin + deck.getSandboxUrl()}</span>
                        <button 
                            class="btn tertiary small icon-only"
                            onclick={() => navigator.clipboard.writeText(window.location.origin + deck.getSandboxUrl())}
                        >
                            <span class="material-symbols-outlined">content_copy</span>
                        </button>
                    </div>
                </div>
                {/if}
            </div>

            {#if !deck}
                <div class="content-area">
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
            
            {#if isSandbox}
                <div class="message message--info">
                    🏖️ Sandbox Mode - Changes won't be saved
                </div>
            {/if}

            <!-- Flashcard Display -->
            <div class="content-area" style="margin-top: var(--space-10);">
                {#if currentCard} <!-- force refresh on async update -->
                {#key currentCard.id} 
                <FlashCard 
                    card={currentCard} 
                    on:score={handleCardScore}
                />
                {/key}
                {:else}
                <div class="empty-state">
                    <div class="empty-state__icon">
                        <span class="material-symbols-outlined">quiz</span>
                    </div>
                    <h3 class="empty-state__title">No cards to study!</h3>
                    <p>Add some flashcards to get started with spaced repetition learning.</p>
                    <button class="btn secondary">
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

    .main-content {
        padding: 1rem;
    }

    /* Page-specific overrides and layout - most styles now in codyx-style.css */
    @media (max-width: 768px) {


        .main-content {
            padding: 1rem;
        }

    }
</style>