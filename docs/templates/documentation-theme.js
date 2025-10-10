// Custom theme configuration for DocumentationJS
module.exports = {
  // Use the default theme but with custom styling
  name: 'default',
  // Custom CSS to inject Codyx branding
  css: `
    /* Codyx Brand Colors */
    :root {
      --codyx-primary: #2563eb;
      --codyx-secondary: #7c3aed;
      --codyx-accent: #f59e0b;
      --codyx-success: #10b981;
      --codyx-bg: #ffffff;
      --codyx-surface: #f8fafc;
    }

    /* Header styling */
    .header {
      background: linear-gradient(135deg, var(--codyx-primary), var(--codyx-secondary));
      color: white;
      padding: 1rem;
      border-bottom: 3px solid var(--codyx-accent);
    }

    .header h1 {
      color: white;
      margin: 0;
      font-size: 1.8rem;
      font-weight: 700;
    }

    /* Navigation styling */
    .navigation {
      background: var(--codyx-surface);
      border-right: 1px solid #e2e8f0;
    }

    .navigation a {
      color: var(--codyx-primary);
      text-decoration: none;
      transition: all 0.2s ease;
    }

    .navigation a:hover {
      background: var(--codyx-primary);
      color: white;
    }

    /* Content styling */
    .main {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
    }

    /* Code blocks */
    pre, code {
      background: #1e293b;
      color: #e2e8f0;
      border-radius: 0.375rem;
    }

    /* Method signatures */
    .signature {
      background: var(--codyx-surface);
      border-left: 4px solid var(--codyx-accent);
      padding: 1rem;
      margin: 1rem 0;
      border-radius: 0.375rem;
    }

    /* Examples */
    .example {
      background: #f0f9ff;
      border: 1px solid #0ea5e9;
      border-radius: 0.5rem;
      padding: 1rem;
      margin: 1rem 0;
    }

    .example h4 {
      color: var(--codyx-primary);
      margin-top: 0;
    }
  `
};