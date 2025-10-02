<script>
    import SatyrnNotebook from '$lib/SatyrnNotebook.svelte';
    import { supabase } from '$lib/supabase-client.js';
</script>

<svelte:head>
    <title>SATYRN - Collaborative Python Notebooks</title>
    <link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;500;600;700;800;900&display=swap" rel="preload" as="style">
    <link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
</svelte:head>

<div class="app-container">
    <header class="app-header">
        <div class="header-content">
            <div class="logo-section">
                <img src="/logo_100.png" alt="SATYRN Logo" class="logo" />
                <h1 class="app-name">SATYRN</h1>
            </div>
            <div class="tagline">
                Collaborative Python Notebooks • No Logins Required
            </div>
        </div>
    </header>

    <main class="main-content">
        <div class="notebook-container">
            <SatyrnNotebook />
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

    .app-name {
        font-family: 'Orbitron', monospace;
        font-size: 1.5rem;
        font-weight: 700;
        margin: 0;
        color: #555958;
        letter-spacing: 0.02em;
    }

    .tagline {
        font-family: 'Raleway', sans-serif;
        font-size: 0.9rem;
        color: #6c757d;
        font-weight: 500;
        text-align: right;
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