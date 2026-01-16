<script>
    import CodyxNotebook from '$lib/components/CodyxNotebook.svelte';
    import { supabase } from '$lib/util/supabase-client.js';
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
        color: #f6ce35;
        font-size: 0.85em;
        font-style: normal;
    }

    /* Page-specific notebook container styling */
    .notebook-container {
        width: 100%;
        max-width: 900px;
        background: white;
        border-radius: var(--border-radius-lg);
        padding: var(--space-8);
        margin: 0 auto;
        position: relative;
        min-height: 400px;
    }

    @media screen {
        .page__main {
            background: linear-gradient(to bottom, #f9fafb 0%, #f3f4f6 100%);
            padding-top: var(--space-6);
            padding-bottom: var(--space-6);
        }

        .notebook-container {
            box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
        }
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