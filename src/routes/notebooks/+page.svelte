<script>
    import CodyxNotebook from '$lib/CodyxNotebook.svelte';
    import { supabase } from '$lib/supabase-client.js';
</script>

<svelte:head>
    <title>CODYX - Collaborative Data Science Notebooks</title>
    <link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;500;600;700;800;900&family=Bowlby+One&display=swap" rel="preload" as="style">
    <link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;500;600;700;800;900&family=Bowlby+One&display=swap" rel="stylesheet">
</svelte:head>

<div class="app-container">
    <main class="main-content">
        <div class="notebook-container">
            <CodyxNotebook />
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

    :global(*) {
        box-sizing: border-box;
    }

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

    .notebook-container {
        width: 100%;
        max-width: 900px;
        background: white;
        border-radius: 12px;
        box-shadow: 0 4px 24px rgba(0, 0, 0, 0.08);
        padding: 2rem;
        margin: 0 auto;
        position: relative;
        min-height: 400px;
    }

    /* Responsive design */
    @media (max-width: 768px) {
        .header-content {
            padding: 1rem;
            flex-direction: column;
            text-align: center;
        }
        
        .app-name {
            font-size: 1.25rem;
        }
        
        .tagline {
            text-align: center;
            font-size: 0.8rem;
        }
        
        .notebook-container {
            padding: 1.5rem;
            margin: 0;
            border-radius: 8px;
        }
        
        .main-content {
            padding: 1rem 0.5rem;
        }
    }

    @media (max-width: 480px) {
        .logo-section {
            gap: 0.75rem;
        }
        
        .logo {
            height: 36px;
            width: 36px;
        }
        
        .app-name {
            font-size: 1rem;
        }
        
        .notebook-container {
            padding: 1rem;
        }
    }
</style>