import { WebR } from 'webr';

class WebRService {
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
            await this.webR.installPackages([
                'ggplot2', 
                'dplyr',
                'tidyr',      // Data reshaping - pivot_longer, pivot_wider
                'plotly',     // Interactive plots! 🎉
                'stringr',    // String manipulation - str_detect, str_replace
                'lubridate'   // Date/time handling - ymd(), today()
            ]);
            await this.webR.installPackages(['ggplot2', 'dplyr']);
            
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

    getStatus() {
        return this.status;
    }
}

// Singleton instance
const webRService = new WebRService();
export default webRService;