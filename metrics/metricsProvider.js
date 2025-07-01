import express from 'express';

export class MetricsProvider {
    #port = 9000;
    constructor(config) {
        this.cacheMisses = config.cacheMisses;
        this.cacheHits = config.cacheHits;
        
        this.app = express();

        this.app.get('/metrics', (req, res) => {
            let response = '';
            for (const [url, count] of Object.entries(this.cacheMisses)) {
                response += `cache_misses{url="${url}"} ${count}\n`;
            }
            for (const [url, count] of Object.entries(this.cacheHits)) {
                response += `cache_hits{url="${url}"} ${count}\n`;
            }
            res.set('Content-Type', 'text/plain');
            res.send(response);
        });

        const server = this.app.listen(this.#port, () => {
            console.log(`Metrics server running on http://localhost:${this.#port}/metrics`);
        });
    }
}