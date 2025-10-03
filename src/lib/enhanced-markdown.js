/**
 * Enhanced Markdown Processor for SATYRN
 * Adds support for collapsible sections inspired by Google Colab
 */

import { marked } from 'marked';

// Configure marked with standard options
marked.setOptions({
    gfm: true,
    breaks: true,
    sanitize: false // We need this for custom HTML
});

/**
 * Process markdown with collapsible sections
 * @param {string} markdownText - The markdown text to process
 * @returns {string} - HTML with collapsible sections
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
                // Regular markdown processing
                result += marked(section.content);
            } else if (section.type === 'collapsible') {
                // Process collapsible section
                const id = `collapsible-${Math.random().toString(36).substr(2, 9)}`;
                const { level, title } = section.info;
                
                // Process the content inside as markdown first
                const processedContent = marked(section.content);
                
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
        // Fallback to regular marked processing
        return marked(markdownText);
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