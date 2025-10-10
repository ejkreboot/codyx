#!/usr/bin/env node

import fs from 'fs/promises';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

async function generateDocsWithDocumentationJS() {
  console.log('🚀 Generating Codyx Documentation with DocumentationJS...\n');

  // Ensure output directories exist
  const outputDirs = [
    './docs/reference/notebook',
    './docs/reference/notebook/html'
  ];

  for (const dir of outputDirs) {
    await fs.mkdir(dir, { recursive: true });
    console.log(`📁 Created directory: ${dir}`);
  }

  // Define all the JavaScript files to document
  const sourceFiles = [
    // Top-level project documentation
    './src/app-docs.js',
    
    // Controller classes
    './src/lib/classes/cells/CellController.svelte.js',
    './src/lib/classes/cells/PythonCellController.svelte.js', 
    './src/lib/classes/cells/RCellController.svelte.js',
    './src/lib/classes/cells/MarkdownCellController.svelte.js',
    
    // Core classes
    './src/lib/classes/notebook.js',
    './src/lib/classes/pyodide-service.js',
    './src/lib/classes/webr-service.js',
    './src/lib/classes/live-text.js',
    './src/lib/classes/lexasort.js',
    
    // Component documentation (separate .jsdoc.js files)
    './src/lib/components/CodyxNotebook.jsdoc.js',
    './src/lib/components/CodyxCell.jsdoc.js',
    './src/lib/components/renderers/PythonCellRenderer.jsdoc.js',
    './src/lib/components/renderers/RCellRenderer.jsdoc.js',
    './src/lib/components/renderers/MarkdownCellRenderer.jsdoc.js'
  ];

  try {
    // Generate HTML documentation
    console.log('📖 Generating HTML documentation...');
    const htmlCommand = `npx documentation build ${sourceFiles.join(' ')} -f html -o docs/reference/notebook/html --project-name "Codyx API Reference" --project-version "1.0.0"`;
    
    const { stdout: htmlOutput, stderr: htmlError } = await execAsync(htmlCommand);
    if (htmlError) console.log('HTML warnings:', htmlError);
    console.log('✅ HTML documentation generated');

    // Generate Markdown documentation
    console.log('📝 Generating Markdown documentation...');
    const mdCommand = `npx documentation build ${sourceFiles.join(' ')} -f md -o docs/reference/notebook/README.md --markdown-toc --shallow`;
    
    const { stdout: mdOutput, stderr: mdError } = await execAsync(mdCommand);
    if (mdError) console.log('Markdown warnings:', mdError);
    console.log('✅ Markdown documentation generated');

    // Generate JSON documentation
    console.log('🔧 Generating JSON documentation...');
    const jsonCommand = `npx documentation build ${sourceFiles.join(' ')} -f json -o docs/reference/notebook/api.json`;
    
    const { stdout: jsonOutput, stderr: jsonError } = await execAsync(jsonCommand);
    if (jsonError) console.log('JSON warnings:', jsonError);
    console.log('✅ JSON documentation generated');

    // Apply Codyx branding
    console.log('🎨 Adding Codyx branding...');
    await execAsync('cp static/favicon.png docs/reference/notebook/html/favicon.ico');
    console.log('✅ Favicon copied');
    
    // Apply custom CSS styling
    await execAsync('cp ./docs/assets/documentation-custom.css ./docs/reference/notebook/html/assets/style.css');
    console.log('✅ Custom CSS applied');

  } catch (error) {
    console.error('❌ Error generating documentation:', error.message);
    process.exit(1);
  }

  console.log('\n🎉 Documentation generation complete!');
  console.log('\n📖 View documentation:');
  console.log('   • HTML: http://localhost:8080 (run `npm run docs:serve`)');
  console.log('   • Markdown: docs/reference/notebook/README.md');  
  console.log('   • JSON API: docs/reference/notebook/api.json');
  console.log('\n� Quick start: npm run docs:serve');
}

generateDocsWithDocumentationJS().catch(console.error);