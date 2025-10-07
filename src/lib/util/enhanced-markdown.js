/**
 * Enhanced Markdown Processor for CODYX
 * Adds support for collapsible sections inspired by Google Colab
 * and KaTeX math rendering
 */

import { marked } from 'marked';
import katex from 'katex';

// Configure marked with standard options
marked.setOptions({
    gfm: true,
    breaks: true,
    sanitize: false // We need this for custom HTML
});

/**
 * Process math expressions in text using KaTeX
 * @param {string} text - Text containing math expressions
 * @returns {string} - Text with math rendered as HTML
 */
function processMath(text) {
    if (!text) return text;
    
    // Process display math ($$...$$) first
    text = text.replace(/\$\$([\s\S]*?)\$\$/g, (match, mathContent) => {
        try {
            return katex.renderToString(mathContent.trim(), {
                displayMode: true,
                throwOnError: false,
                errorColor: '#cc0000',
                strict: 'warn'
            });
        } catch (error) {
            console.warn('KaTeX display math error:', error.message);
            return `<span class="math-error">$$${mathContent}$$</span>`;
        }
    });
    
    // Process inline math ($...$) - be careful not to match display math remnants
    text = text.replace(/(?<!\$)\$(?!\$)((?:[^$\n]|\\\$)+?)\$(?!\$)/g, (match, mathContent) => {
        try {
            return katex.renderToString(mathContent.trim(), {
                displayMode: false,
                throwOnError: false,
                errorColor: '#cc0000',
                strict: 'warn'
            });
        } catch (error) {
            console.warn('KaTeX inline math error:', error.message);
            return `<span class="math-error">$${mathContent}$</span>`;
        }
    });
    
    return text;
}

/**
 * Process markdown with collapsible sections and math rendering
 * @param {string} markdownText - The markdown text to process
 * @returns {string} - HTML with collapsible sections and rendered math
 */
export function processEnhancedMarkdown(markdownText) {
    if (!markdownText || typeof markdownText !== 'string') return '';
    
    try {
        // Split into sections and process each part separately
        const sections = [];
        const lines = markdownText.split('\n');
        let currentSection = [];
        let inCollapsible = false;
        let collapsibleInfo = null;
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            
            // Check for collapsible section start
            const collapsibleStart = line.match(/^(#+)\s*@title\s+(.+?)\s*\{\s*display-mode:\s*["']?form["']?\s*\}$/);
            
            if (collapsibleStart) {
                // Process any accumulated non-collapsible content
                if (currentSection.length > 0) {
                    sections.push({
                        type: 'markdown',
                        content: currentSection.join('\n')
                    });
                    currentSection = [];
                }
                
                // Start new collapsible section
                const level = collapsibleStart[1].length;
                const title = collapsibleStart[2].trim();
                collapsibleInfo = { level, title };
                inCollapsible = true;
                continue;
            }
            
            // Check for end marker
            const endMarker = line.match(/^#+\s*@end$/);
            if (endMarker && inCollapsible) {
                // End collapsible section
                sections.push({
                    type: 'collapsible',
                    info: collapsibleInfo,
                    content: currentSection.join('\n')
                });
                currentSection = [];
                inCollapsible = false;
                collapsibleInfo = null;
                continue;
            }
            
            // Check if we hit a new section at same/higher level
            if (inCollapsible) {
                const newSection = line.match(/^(#+)\s*@title/);
                const higherLevelHeading = line.match(/^(#+)\s+/) && 
                                         line.match(/^(#+)\s+/)[1].length <= collapsibleInfo.level &&
                                         !line.includes('@title');
                
                if (newSection || higherLevelHeading) {
                    // Auto-close current collapsible
                    sections.push({
                        type: 'collapsible',
                        info: collapsibleInfo,
                        content: currentSection.join('\n')
                    });
                    currentSection = [];
                    inCollapsible = false;
                    collapsibleInfo = null;
                    // Continue processing this line
                }
            }
            
            currentSection.push(line);
        }
        
        // Handle remaining content
        if (currentSection.length > 0) {
            if (inCollapsible) {
                sections.push({
                    type: 'collapsible',
                    info: collapsibleInfo,
                    content: currentSection.join('\n')
                });
            } else {
                sections.push({
                    type: 'markdown',
                    content: currentSection.join('\n')
                });
            }
        }
        
        // Now process each section and combine
        let result = '';
        
        for (const section of sections) {
            if (section.type === 'markdown') {
                // Regular markdown processing with math
                const markdownHtml = marked(section.content);
                result += processMath(markdownHtml);
            } else if (section.type === 'collapsible') {
                // Process collapsible section
                const id = `collapsible-${Math.random().toString(36).substr(2, 9)}`;
                const { level, title } = section.info;
                
                // Process the content inside as markdown first, then add math
                const markdownHtml = marked(section.content);
                const processedContent = processMath(markdownHtml);
                
                result += `
<div class="collapsible-section">
    <div class="collapsible-header" onclick="toggleCollapsible('${id}', event)" role="button" tabindex="0" onkeydown="if(event.key==='Enter') toggleCollapsible('${id}', event)">
        <span class="material-symbols-outlined collapsible-icon" id="icon-${id}">keyboard_arrow_right</span>
        <h${level} class="collapsible-title">${title}</h${level}>
    </div>
    <div class="collapsible-content" id="${id}" style="display: none;">
        ${processedContent}
    </div>
</div>
                `.trim();
            }
        }
        
        return result;
    } catch (error) {
        console.error('Error processing enhanced markdown:', error);
        // Fallback to regular marked processing with math
        const markdownHtml = marked(markdownText);
        return processMath(markdownHtml);
    }
}/**
 * JavaScript function to be injected into the page for collapsible functionality
 */
export const collapsibleScript = `
function toggleCollapsible(id, event) {
    // Prevent the click from bubbling up to the markdown cell
    if (event) {
        event.stopPropagation();
        event.preventDefault();
    }
    
    const content = document.getElementById(id);
    const icon = document.getElementById('icon-' + id);
    
    if (content && icon) {
        if (content.style.display === 'none' || content.style.display === '') {
            content.style.display = 'block';
            icon.textContent = 'expand_more';  // Status: now expanded (pointing down)
        } else {
            content.style.display = 'none';
            icon.textContent = 'keyboard_arrow_right';  // Status: now collapsed (pointing right)
        }
    }
}
`;