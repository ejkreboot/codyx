import { WebR } from 'webr';

/**
 * R statistical computing service using WebR WebAssembly
 * 
 * Provides R statistical computing capabilities in the browser via WebR.
 * Handles R code execution, package management, data analysis, and statistical
 * computations without requiring an R server.
 * 
 * @class WebRService  
 * @example
 * // Initialize R environment
 * const webR = new WebRService();
 * await webR.initialize();
 * 
 * // Execute R code
 * const result = await webR.executeCode('data <- c(1,2,3,4,5); mean(data)');
 * console.log(result.output); // [1] 3
 * 
 * // Install R packages
 * await webR.installPackages(['ggplot2', 'dplyr']);
 * 
 * // Check available packages
 * const packages = await webR.getInstalledPackages();
 * console.log(packages); // ['base', 'stats', 'ggplot2', ...]
 */
class WebRService {
    /**
     * Create a new WebRService instance
     * Initializes the R runtime manager with default state
     */
    constructor() {
        this.webR = null;
        this.status = 'not-started';
        this.initPromise = null;
    }

    async initialize() {
        if (this.status === 'ready') return;
        if (this.initPromise) return this.initPromise;

        this.initPromise = this._doInitialize();
        return this.initPromise;
    }

    async _doInitialize() {
        if (this.status !== 'not-started') return;
        
        this.status = 'initializing';
        
        try {
            this.webR = new WebR({
                SW_URL: '/webr-sw.js'
            });
            
            await this.webR.init();            
            
            // Don't pre-install packages - use lazy loading instead!
            // This prevents the massive download at startup
            
            // Set default plot size (width=480, height=320 for 3:2 ratio)  
            await this.webR.evalR(`
                options(repr.plot.width = 4.8, repr.plot.height = 3.2)
                webr::canvas(width = 480, height = 320)
            `);
            
            this.status = 'ready';
        } catch (error) {
            this.status = 'error';
            throw error;
        }
    }

    async executeCode(code) {
        if (this.status !== 'ready') {
            await this.initialize();
        }

        // Auto-install packages that are used in the code
        await this.ensurePackagesLoaded(code);

        try {
            
            // Capture output and plots
            const shelter = await new this.webR.Shelter();
            try {
                // Execute the R code with proper output capture
                const result = await shelter.captureR(code, {
                    withAutoprint: true,
                    captureStreams: true,
                    captureConditions: true,
                    env: await this.webR.objs.globalEnv
                });

                let output = '';
                let plots = [];
                
                // Process output messages - keep raw formatting
                let outputLines = [];
                for (const msg of result.output) {
                    if (msg.type === 'stdout' || msg.type === 'stderr') {
                        // Split by lines and preserve each line
                        const lines = msg.data.split('\n');
                        outputLines.push(...lines);
                    }
                }
                
                // Join lines back with newlines to preserve original formatting
                output = outputLines.join('\n');

                // Process any plots - convert ImageBitmap to displayable format
                
                if (result && result.images && result.images.length > 0) {                    
                    // Convert each ImageBitmap to a data URL
                    for (const imageBitmap of result.images) {
                        if (imageBitmap instanceof ImageBitmap) {
                            // Create a canvas to convert ImageBitmap to data URL
                            const canvas = document.createElement('canvas');
                            canvas.width = imageBitmap.width;
                            canvas.height = imageBitmap.height;
                            const ctx = canvas.getContext('2d');
                            
                            // Draw the ImageBitmap to the canvas
                            ctx.drawImage(imageBitmap, 0, 0);
                            
                            // Convert to data URL
                            const dataUrl = canvas.toDataURL('image/png');
                            plots.push(dataUrl);
                            
                            // MEMORY LEAK FIX: Release ImageBitmap and canvas
                            imageBitmap.close(); // Release ImageBitmap memory
                            canvas.width = 0;     // Clear canvas memory  
                            canvas.height = 0;
                            
                        }
                    }
                }
                
                return {
                    output: output.trim(),
                    plots: plots,
                    error: null
                };

            } finally {
                shelter.purge();
            }

        } catch (error) {
            console.error('❌ R execution error:', error);
            
            return {
                output: null,
                plots: [],
                error: this._extractErrorMessage(error)
            };
        }
    }

    _extractErrorMessage(error) {
        if (error.message) {
            return error.message;
        }
        return String(error);
    }

    // Auto-detect and install packages used in R code
    async ensurePackagesLoaded(code) {
        const commonPackages = {
            'ggplot2': /\b(ggplot|geom_|aes\(|theme_)/,
            'dplyr': /\b(filter\(|select\(|mutate\(|arrange\(|summarise\(|group_by\(|%>%)/,
            'tidyr': /\b(pivot_longer|pivot_wider|gather|spread|separate|unite)/,
            'plotly': /\b(ggplotly|plot_ly)/,
            'stringr': /\b(str_detect|str_replace|str_extract|str_length)/,
            'lubridate': /\b(ymd|mdy|dmy|today|now|year|month|day)/
        };

        const packagesToInstall = [];
        
        // Check which packages are used in the code
        for (const [pkg, pattern] of Object.entries(commonPackages)) {
            if (pattern.test(code)) {
                packagesToInstall.push(pkg);
            }
        }

        // Also check for library() calls
        const libraryMatches = code.match(/library\s*\(\s*([^)]+)\s*\)/g);
        if (libraryMatches) {
            libraryMatches.forEach(match => {
                const pkg = match.match(/library\s*\(\s*([^)]+)\s*\)/)[1].replace(/['"]/g, '');
                if (!packagesToInstall.includes(pkg)) {
                    packagesToInstall.push(pkg);
                }
            });
        }

        // Install packages that are needed but not yet installed
        if (packagesToInstall.length > 0) {
            try {
                await this.webR.installPackages(packagesToInstall);
            } catch (error) {
                console.log(`⚠️ Some R packages may not have installed correctly:`, error);
            }
        }
    }

    // Memory cleanup method
    async cleanup() {
        if (this.webR) {
            try {
                // Close WebR connection and clean up memory
                await this.webR.close();
            } catch (error) {
                console.log('⚠️ WebR cleanup error:', error);
            } finally {
                this.webR = null;
                this.status = 'not-started';
                this.initPromise = null;
            }
        }
    }

    getStatus() {
        return this.status;
    }
}

// Singleton instance
const webRService = new WebRService();
export default webRService;