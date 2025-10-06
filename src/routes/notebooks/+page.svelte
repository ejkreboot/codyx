<script>
    import CodyxNotebook from '$lib/CodyxNotebook.svelte';
    import { supabase } from '$lib/supabase-client.js';
</script>

<svelte:head>
    <title>CODYX - Collaborative Data Science Notebooks</title>
    <link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;500;600;700;800;900&family=Bowlby+One&display=swap" rel="preload" as="style">
    <link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;500;600;700;800;900&family=Bowlby+One&display=swap" rel="stylesheet">
    <link href="/src/assets/codyx-style.css" rel="stylesheet">
</svelte:head>

<div class="page">
    <main class="page__main">
        <div class="notebook-container">
            <CodyxNotebook />
        </div>
    </main>
</div>

<style>
    /* Global R symbol using Bowlby One font */
    :global(.r-symbol::before) {
        content: 'R';
        font-family: 'Bowlby One', serif;
        font-weight: normal;
        font-style: normal;
    }

    /* Global Python symbol using Orbitron font */
    :global(.python-symbol::before) {
        content: 'Py';
        font-family: 'Orbitron', monospace;
        font-weight: 600;
        font-size: 0.85em;
        font-style: normal;
    }

    /* Page-specific notebook container styling */
    .notebook-container {
        width: 100%;
        max-width: 900px;
        background: white;
        border-radius: var(--border-radius-lg);
        box-shadow: var(--shadow-md);
        padding: var(--space-8);
        margin: 0 auto;
        position: relative;
        min-height: 400px;
    }

    /* Responsive design */
    @media (max-width: 768px) {
        .notebook-container {
            padding: var(--space-6);
            margin: 0;
            border-radius: var(--border-radius-md);
        }
        
        .page__main {
            padding: var(--space-4) var(--space-2);
        }
    }

    @media (max-width: 480px) {
        .notebook-container {
            padding: var(--space-4);
        }
    }
</style>