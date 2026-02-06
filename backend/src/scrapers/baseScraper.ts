import { chromium } from "playwright"
import type { CompanyConfig } from "./companies"

export async function runScraper(config: CompanyConfig) {
  const browser = await chromium.launch({ headless: false })
  const page = await browser.newPage()

  try {
    console.log(`\nScraping: ${config.name}`)

    await page.goto(config.url, {
      waitUntil: "domcontentloaded",
      timeout: 60_000
    })

    // SPA-safe waiting
    await page.waitForLoadState("networkidle")
    await page.waitForTimeout(3000)

    const jobs = await page.$$eval(
      config.selectors.card,
      links =>
        links
          .map(link => ({
            title: link.textContent?.trim() || "",
            applyUrl: (link as HTMLAnchorElement).href
          }))
          .filter(j => j.title.length > 5)
    )

    console.log(`Jobs found: ${jobs.length}`)
    console.log(jobs.slice(0, 5))
  } catch (err) {
    console.error("Scraper error:", err)
  } finally {
    await browser.close()
  }
}
