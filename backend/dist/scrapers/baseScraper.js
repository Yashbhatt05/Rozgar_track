"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runScraper = runScraper;
const playwright_1 = require("playwright");
async function runScraper(config) {
    const browser = await playwright_1.chromium.launch({ headless: false });
    const page = await browser.newPage();
    try {
        console.log(`\nScraping: ${config.name}`);
        await page.goto(config.url, {
            waitUntil: "domcontentloaded",
            timeout: 60000
        });
        // SPA-safe waiting
        await page.waitForLoadState("networkidle");
        await page.waitForTimeout(3000);
        const jobs = await page.$$eval(config.selectors.card, links => links
            .map(link => ({
            title: link.textContent?.trim() || "",
            applyUrl: link.href
        }))
            .filter(j => j.title.length > 5));
        console.log(`Jobs found: ${jobs.length}`);
        console.log(jobs.slice(0, 5));
    }
    catch (err) {
        console.error("Scraper error:", err);
    }
    finally {
        await browser.close();
    }
}
