<script>
    import { goto } from '$app/navigation';
    import Haikunator from 'haikunator';

    let notebookSlug = $state('');
    let isCreating = $state(false);

    async function createNotebook() {
        try {
            isCreating = true;
            
            // Generate a unique slug using the same logic as the app
            const haikunator = new Haikunator();
            const newSlug = haikunator.haikunate({ tokenLength: 0 });
            
            // Navigate to the notebook - the Notebook.create() will handle creation automatically
            await goto(`/notebooks?slug=${encodeURIComponent(newSlug)}`);
        } catch (error) {
            console.error('Failed to create notebook:', error);
            // Could show an error message to user here
        } finally {
            isCreating = false;
        }
    }

    function openNotebook() {
        if (notebookSlug.trim()) {
            goto(`/notebooks?slug=${encodeURIComponent(notebookSlug.trim())}`);
        }
    }

    function handleKeydown(event) {
        if (event.key === 'Enter') {
            event.preventDefault();
            openNotebook();
        }
    }
</script>

<svelte:head>
    <title>CODYX - Collaborative Data Science Notebooks</title>
    <link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;500;600;700;800;900&family=Bowlby+One&display=swap" rel="preload" as="style">
    <link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;500;600;700;800;900&family=Bowlby+One&display=swap" rel="stylesheet">
    <link href="https://fonts.googleapis.com/css2?family=Raleway:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    <link href="https://fonts.googleapis.com/icon?family=Material+Symbols+Outlined" rel="stylesheet">
</svelte:head>



<div class="landing-container">
    <!-- Navigation Header -->
    <header class="landing-header">
        <div class="header-content">
            <div class="logo-section">
                                <img src="/logo_100.png" alt="CODYX Logo" class="logo" />
                <div class="brand-info">
                    <h1 class="app-name">CODYX</h1>
                    <div class="tagline">
                        Collaborative Data Science Notebooks • No Logins Required
                    </div>
                </div>
            </div>
        </div>
    </header>

    <!-- Hero Section -->
    <main class="hero-section">
        <div class="hero-content">
            <div class="hero-text">
                <h1 class="hero-title">
                    Create Interactive<br>
                    <span class="gradient-text">Data Science Notebooks</span>
                </h1>
                <p class="hero-description">
                    Markdown, Python and R code in your browser. <br>
                    Share your analyses instantly with a simple link.
                </p>
                
                <div class="hero-actions">
                    <div class="input-group">
                        <input 
                            type="text" 
                            bind:value={notebookSlug}
                            onkeydown={handleKeydown}
                            placeholder="notebook-name"
                            class="notebook-input"
                        />
                        <button class="open-btn" onclick={openNotebook} disabled={!notebookSlug.trim()}>
                            Open
                        </button>
                        <button class="create-btn" onclick={createNotebook} disabled={isCreating}>
                            {#if isCreating}
                                <span class="material-symbols-outlined">hourglass_empty</span>
                                Creating...
                            {:else}
                                <span class="material-symbols-outlined">add</span>
                                New Notebook
                            {/if}
                        </button>
                    </div>
                </div>
            </div>
            
            <div class="hero-visual">
                <div class="desktop-mockup">
                    <img src="/desktop.png" alt="CODYX Desktop Application" class="desktop-image" />
                </div>
            </div>
        </div>
    </main>

    <!-- Features Section -->
    <section class="features-section">
        <div class="features-content">
            <div class="feature">
                <div class="feature-icon">
                    <span class="material-symbols-outlined">lock_open</span>
                </div>
                <h3>No Login Required</h3>
                <p>Share notebooks with a simple URL. Perfect for classrooms and collaboration.</p>
            </div>


            <div class="feature">
                <div class="feature-icon">
                    <span class="material-symbols-outlined">cloud</span>
                </div>
                <h3>Browser-Based</h3>
                <p>Markdown, Python, and R code in your browser, backed by an industrial strength database.</p>
            </div>
                        
            <div class="feature">
                <div class="feature-icon">
                    <span class="material-symbols-outlined">diversity_3</span>
                </div>
                <h3>Real-time Collaboration</h3>
                <p>Multiple users can edit the same notebook simultaneously with live updates.</p>
            </div>
        </div>
    </section>
</div>

<style>
    @import url('https://fonts.googleapis.com/css2?family=Raleway:ital,wght@0,300;0,400;0,500;0,600;1,400&display=swap');

    :global(body) {
        margin: 0;
        padding: 0;
        font-family: 'Raleway', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        background: linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%);
        min-height: 100vh;
    }

    :global(.r-symbol::before) {
        content: 'R';
        font-family: 'Bowlby One', cursive;
        font-weight: 400;
        color: #054ba4;
        font-size: 1.2em;
    }

    :global(.python-symbol::before) {
        content: 'Py';
        font-family: 'Orbitron', monospace;
        font-weight: 600;
        color: #f6ce35;
        font-size: 0.9em;
    }

    .landing-container {
        min-height: 100vh;
        display: flex;
        flex-direction: column;
    }

    .landing-header {
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

    .hero-section {
        flex: 1;
        display: flex;
        align-items: center;
        padding: 2rem 2rem;
        min-height: 60vh;
    }

    .hero-content {
        max-width: 1200px;
        margin: 0 auto;
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 4rem;
        align-items: center;
    }

    .hero-text {
        color: #555958;
    }

    .hero-title {
        font-size: 3.5rem;
        font-weight: 700;
        line-height: 1.2;
        margin: 0 0 1.5rem 0;
    }

    .gradient-text {
        background: linear-gradient(45deg, #ff6b6b, #feca57, #48dbfb, #ff9ff3);
        background-size: 300% 300%;
        -webkit-background-clip: text;
        background-clip: text;
        -webkit-text-fill-color: transparent;
        animation: gradient 6s ease infinite;
    }

    @keyframes gradient {
        0% { background-position: 0% 50%; }
        50% { background-position: 100% 50%; }
        100% { background-position: 0% 50%; }
    }

    .hero-description {
        font-size: 1.2rem;
        line-height: 1.6;
        margin: 0 0 2rem 0;
        color: #555958;
    }

    .hero-actions {
        display: flex;
        flex-direction: column;
        gap: 1.5rem;
        align-items: flex-start;
    }

    .input-group {
        display: flex;
        gap: 0.5rem;
        width: 100%;
        max-width: 600px;
    }

    .notebook-input {
        flex: 1;
        padding: 0.75rem 1rem;
        border: 2px solid rgba(0, 0, 0, 0.1);
        border-radius: 8px;
        background: white;
        color: #555958;
        font-size: 1rem;
        transition: all 0.3s ease;
    }

    .notebook-input::placeholder {
        color: rgba(85, 89, 88, 0.6);
    }

    .notebook-input:focus {
        outline: none;
        border-color: #0095f2;
        background: white;
    }

    .open-btn {
        padding: 0.75rem 1.5rem;
        border-radius: 8px;
        background: #0095f2;
        color: white;
        font-size: 1rem;
        font-weight: 500;
        cursor: pointer;
        border: 2px solid #0095f2;
        transition: all 0.3s ease;
        white-space: nowrap;
    }

    .open-btn:hover:not(:disabled) {
        background: #007acc;
        border-color: #007acc;
    }

    .open-btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }

    .create-btn {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.75rem 1.5rem;
        border-radius: 8px;
        background: #faa336;
        color: white;
        font-size: 1rem;
        font-weight: 500;
        cursor: pointer;
        border: 2px solid #faa336;
        transition: all 0.3s ease;
        white-space: nowrap;
    }

    .create-btn:hover:not(:disabled) {
        background: #e8932e;
        border-color: #e8932e;
    }

    .create-btn:disabled {
        opacity: 0.7;
        cursor: not-allowed;
    }

    .hero-visual {
        display: flex;
        justify-content: center;
        align-items: center;
    }

    .desktop-mockup {
        width: 100%;
        max-width: 600px;
    }

    .desktop-image {
        width: 100%;
        height: auto;
        display: block;
    }

    .features-section {
        background: rgba(0, 0, 0, 0.02);
        padding: 4rem 2rem;
    }

    .features-content {
        max-width: 1200px;
        margin: 0 auto;
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 3rem;
    }

    .feature {
        text-align: center;
    }

    .feature-icon {
        background: rgba(0, 149, 242, 0.1);
        width: 80px;
        height: 80px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        margin: 0 auto 1.5rem auto;
        border: 1px solid rgba(0, 149, 242, 0.2);
    }

    .feature-icon .material-symbols-outlined {
        font-size: 32px;
        color: #0095f2;
    }

    .feature h3 {
        font-size: 1.5rem;
        font-weight: 600;
        margin: 0 0 1rem 0;
        color: #555958;
    }

    .feature p {
        font-size: 1rem;
        line-height: 1.6;
        color: #555958;
        margin: 0;
    }

    @media (max-width: 1024px) {
        .hero-content {
            grid-template-columns: 1fr;
            gap: 3rem;
            text-align: center;
        }

        .desktop-mockup {
            max-width: 500px;
            margin: 0 auto;
        }
    }

    @media (max-width: 768px) {
        .hero-title {
            font-size: 2.5rem;
        }

        .hero-description {
            font-size: 1.1rem;
        }

        .desktop-mockup {
            max-width: 100%;
        }

        .features-content {
            grid-template-columns: 1fr;
            gap: 2rem;
        }

        .input-group {
            flex-direction: column;
        }
    }

    @media (max-width: 480px) {
        .hero-title {
            font-size: 2rem;
        }

        .hero-description {
            font-size: 1rem;
        }

        .hero-section {
            padding: 1rem 2rem;
        }
    }
</style>
