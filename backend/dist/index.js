"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const airbnbApiScraper_1 = require("./scrapers/airbnbApiScraper");
async function main() {
    const jobs = await (0, airbnbApiScraper_1.scrapeAirbnbJobs)();
    console.log(`Total jobs: ${jobs.length}`);
    console.log(jobs.slice(0, 5));
}
main();
