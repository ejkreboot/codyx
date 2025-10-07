<script>
    import { onMount, onDestroy } from 'svelte';
    import favicon from '$lib/assets/favicon.png';
    import '../assets/codyx-style.css';
    import { pyodideService } from '$lib/classes/pyodide-service.js';
    import webRService from '$lib/classes/webr-service.js';

    let { children } = $props();

    // Global cleanup to prevent memory leaks
    onMount(() => {

        const handleBeforeUnload = async () => {
            console.log('🧹 Page unloading - cleaning up services...');
            try {
                await pyodideService.cleanup();
                await webRService.cleanup();
            } catch (error) {
                console.log('⚠️ Cleanup error:', error);
            }
        };

        window.addEventListener('beforeunload', handleBeforeUnload);
        
        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
        };
    });

    onDestroy(async () => {
        // Cleanup services when layout is destroyed
        console.log('🧹 Layout destroyed - cleaning up services...');
                
        try {
            await pyodideService.cleanup();
            await webRService.cleanup();
        } catch (error) {
            console.log('⚠️ Layout cleanup error:', error);
        }
    });
</script>

<svelte:head>
    <link rel="icon" href={favicon} />
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Raleway:wght@300;400;500;600;700&display=swap" rel="stylesheet">
</svelte:head>

<header class="app-header">
    <div class="header-content">
        <div class="logo-section">
            <img src="/logo_200.png" alt="CODYX Logo" class="logo" />
            <div class="brand-info">
                <h1 class="app-name">CODYX</h1>
                <div class="tagline">
                    Collaborative Learning and Research Tools • No Logins Required
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
<main class="app-container">
    {@render children?.()}
</main>

<footer class="app-footer">
    © 2025 Eric J. Kort. License: <a href="https://mit-license.org/" target="_blank" rel="noopener">&nbsp;MIT</a>. 
    Bugs? Suggestions? Open an issue on <a href="https://github.com/ejkreboot/codyx" target="_blank" rel="noopener">&nbsp;GitHub</a>. 
	Created with lots of help from <a href="https://www.anthropic.com/claude/sonnet" target="_blank" rel="noopener">&nbsp;Claude Sonnet 4</a>.
</footer>

<style>
    .app-container {
        min-height: calc(100vh - 60px);
    }

    .app-footer {
        height: 60px;
        padding: 1rem 2rem;
        border-top: 1px solid #f0f0f0;
        background: #fafafa;
        text-align: center;
        font-family: 'Raleway', sans-serif;
        font-size: 12px;
        color: #888;
        line-height: 1.4;
        display: flex;
        align-items: center;
        justify-content: center;
    }

    .app-footer a {
        color: #0095f2;
        text-decoration: none;
        font-weight: 500;
        transition: color 0.2s ease;
    }

    .app-footer a:hover {
        color: #0074cc;
        text-decoration: underline;
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
</style>