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
    <header class="app-header">
        <div class="header-content">
            <div class="logo-section">
                <img src="/logo_200.png" alt="CODYX Logo" class="logo" />
                <div class="brand-info">
                    <h1 class="app-name">CODYX</h1>
                    <div class="tagline">
                        Collaborative Data Science Notebooks • No Logins Required
                    </div>
                </div>
            </div>
            <div class="header-actions">
                <button class="new-notebook-btn" onclick={() => window.dispatchEvent(new CustomEvent('createNewNotebook'))}>
                    <span class="material-symbols-outlined">add</span>
                    New Notebook
                </button>
            </div>
        </div>
    </header>

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

    .app-header {
        background: linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%);
        border-bottom: 1px solid #e9ecef;
        box-shadow: 0 2px 12px rgba(0, 0, 0, 0.05);
        position: sticky;
        top: 0;
        z-index: 100;
    }

    .header-content {
        max-width: 1200px;
        margin: 0 auto;
        padding: 1rem 2rem;
        display: flex;
        align-items: center;
        justify-content: space-between;
        flex-wrap: wrap;
        gap: 1rem;
    }

    .logo-section {
        display: flex;
        align-items: center;
        gap: 1rem;
    }

    .logo {
        height: 48px;
        width: 48px;
        object-fit: contain;
        filter: drop-shadow(0 2px 8px rgba(0, 0, 0, 0.1));
    }

    .brand-info {
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
    }

    .app-name {
        font-family: 'Orbitron', monospace;
        font-size: 1.5rem;
        font-weight: 300;
        margin: -4px 0 0 0;
        color: #555958;
        letter-spacing: 0.15em;
        line-height: 1;
    }

    .tagline {
        font-family: 'Raleway', sans-serif;
        font-size: 0.65rem;
        color: #999;
        font-weight: 400;
        margin: 0;
        line-height: 0.5;
    }

    .header-actions {
        display: flex;
        align-items: center;
    }

    .new-notebook-btn {
        background: linear-gradient(135deg, #0095f2, #00b4d8);
        color: white;
        border: none;
        border-radius: 8px;
        padding: 0.75rem 1.25rem;
        font-family: 'Raleway', sans-serif;
        font-size: 14px;
        font-weight: 600;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 0.5rem;
        transition: all 0.2s ease;
        box-shadow: 0 2px 8px rgba(0, 149, 242, 0.3);
    }

    .new-notebook-btn:hover {
        transform: translateY(-1px);
        box-shadow: 0 4px 12px rgba(0, 149, 242, 0.4);
    }

    .new-notebook-btn .material-symbols-outlined {
        font-size: 18px;
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