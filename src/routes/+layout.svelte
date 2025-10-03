<script>
    import favicon from '$lib/assets/favicon.png';

    let { children } = $props();
</script>

<svelte:head>
    <link rel="icon" href={favicon} />
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Raleway:wght@300;400;500;600;700&display=swap" rel="stylesheet">
</svelte:head>

<main class="app-container">
    {@render children?.()}
</main>

<footer class="app-footer">
    © 2025 Eric J. Kort. License: <a href="https://mit-license.org/" target="_blank" rel="noopener">&nbsp;MIT</a>. 
    Bugs? Suggestions? Open an issue on <a href="https://github.com/ejkreboot/satyrn" target="_blank" rel="noopener">&nbsp;GitHub</a>.
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
</style>