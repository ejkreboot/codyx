/**
 * Parse .ipynb files and convert to SATYRN format
 */

export function parseIpynbFile(fileContent) {
    try {
        const notebook = JSON.parse(fileContent);
        const cells = [];
        
        if (!notebook.cells || !Array.isArray(notebook.cells)) {
            throw new Error('Invalid notebook format: no cells found');
        }
        
        notebook.cells.forEach((cell) => {
            const source = Array.isArray(cell.source) ? cell.source.join('') : (cell.source || '');
            
            switch(cell.cell_type) {
                case 'markdown':
                    if (source.trim()) {
                        cells.push({
                            type: 'md',
                            content: source
                        });
                    }
                    break;
                    
                case 'code':
                    if (source.trim()) {
                        // First check for explicit language indicators in metadata
                        let language = 'code'; // default to Python
                        
                        if (cell.metadata) {
                            // Check various metadata fields for language info
                            const metaLang = cell.metadata.language || 
                                           cell.metadata.kernel || 
                                           cell.metadata.vscode?.languageId;
                            
                            if (metaLang && (metaLang.toLowerCase() === 'r' || metaLang.toLowerCase() === 'ir')) {
                                language = 'r';
                            }
                        }
                        
                        // Fallback to heuristic detection if no metadata
                        if (language === 'code' && detectRCode(source)) {
                            language = 'r';
                        }
                        
                        cells.push({
                            type: language,
                            content: source
                        });
                    }
                    break;
                    
                // Skip raw cells, outputs, etc. for now
            }
        });
        
        return cells;
    } catch (error) {
        console.error('Error parsing notebook:', error);
        throw new Error(`Failed to parse notebook: ${error.message}`);
    }
}

function detectRCode(source) {
    // Simple R detection heuristics
    const rPatterns = [
        /library\s*\(/,
        /ggplot\s*\(/,
        /<-/,
        /\$[a-zA-Z_]/,
        /data\.frame\s*\(/,
        /install\.packages/,
        /str\s*\(/,
        /summary\s*\(/,
        /head\s*\(/,
        /tail\s*\(/,
        /plot\s*\(/,
        /lm\s*\(/,
        /glm\s*\(/,
        /aes\s*\(/
    ];
    
    // Count matches
    const matches = rPatterns.filter(pattern => pattern.test(source)).length;
    
    // If 2+ R patterns match, likely R code
    return matches >= 2;
}

export function validateIpynbFile(file) {
    if (!file) return { valid: false, error: 'No file provided' };
    
    if (!file.name.endsWith('.ipynb')) {
        return { valid: false, error: 'File must have .ipynb extension' };
    }
    
    if (file.size > 10 * 1024 * 1024) { // 10MB limit
        return { valid: false, error: 'File too large (max 10MB)' };
    }
    
    return { valid: true };
}