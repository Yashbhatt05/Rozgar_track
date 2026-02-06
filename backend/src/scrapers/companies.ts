export interface CompanyConfig {
  name: string
  url: string
  selectors: {
    card: string
    title?: string
    location?: string
  }
}

export const companies: CompanyConfig[] = [
  {
    name: "Airbnb",
    url: "https://careers.airbnb.com/positions/",
    selectors: {
      card:' a[href^="/positions/"]:not([href*="#"])'
      // title = anchor text
      // location not available on listing page
    }
  }
]
