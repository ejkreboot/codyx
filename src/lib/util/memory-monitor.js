// Memory monitoring utility for debugging memory leaks
class MemoryMonitor {
    constructor() {
        this.measurements = [];
        this.isMonitoring = false;
    }

    start() {
        if (this.isMonitoring) return;
        
        this.isMonitoring = true;
        console.log('🔍 Memory monitoring started');
        
        this.measureMemory();
        this.interval = setInterval(() => {
            this.measureMemory();
        }, 5000); // Check every 5 seconds
    }

    stop() {
        if (!this.isMonitoring) return;
        
        this.isMonitoring = false;
        clearInterval(this.interval);
        console.log('⏹️ Memory monitoring stopped');
        this.printSummary();
    }

    measureMemory() {
        if (!performance.memory) {
            console.log('⚠️ Memory API not available in this browser');
            return;
        }

        const memory = {
            timestamp: Date.now(),
            used: Math.round(performance.memory.usedJSHeapSize / 1024 / 1024), // MB
            total: Math.round(performance.memory.totalJSHeapSize / 1024 / 1024), // MB
            limit: Math.round(performance.memory.jsHeapSizeLimit / 1024 / 1024) // MB
        };

        this.measurements.push(memory);
        
        // Keep only last 20 measurements
        if (this.measurements.length > 20) {
            this.measurements.shift();
        }

        // Log if memory usage increased significantly
        if (this.measurements.length > 1) {
            const prev = this.measurements[this.measurements.length - 2];
            const increase = memory.used - prev.used;
            
            if (increase > 10) { // More than 10MB increase
                console.log(`⚠️ Memory increase: +${increase}MB (now ${memory.used}MB used)`);
            }
        }
    }

    printSummary() {
        if (this.measurements.length === 0) return;
        
        const first = this.measurements[0];
        const last = this.measurements[this.measurements.length - 1];
        const totalIncrease = last.used - first.used;
        const timeElapsed = (last.timestamp - first.timestamp) / 1000; // seconds
        
        console.log('📊 Memory Usage Summary:');
        console.log(`  Start: ${first.used}MB`);
        console.log(`  End: ${last.used}MB`);
        console.log(`  Change: ${totalIncrease > 0 ? '+' : ''}${totalIncrease}MB`);
        console.log(`  Time: ${Math.round(timeElapsed)}s`);
        console.log(`  Rate: ${(totalIncrease / (timeElapsed / 60)).toFixed(2)}MB/min`);
        
        if (totalIncrease > 50) {
            console.log('🚨 Potential memory leak detected! (+50MB or more)');
        }
    }

    getCurrentUsage() {
        if (!performance.memory) return null;
        return Math.round(performance.memory.usedJSHeapSize / 1024 / 1024);
    }
}

// Export singleton
export const memoryMonitor = new MemoryMonitor();

// Add to global for debugging
if (typeof window !== 'undefined') {
    window.memoryMonitor = memoryMonitor;
}