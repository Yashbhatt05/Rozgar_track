export interface AirbnbJob {
  id: string
  title: string
  location: string
  url: string
}

const BASE_URL =
  "https://boards-api.greenhouse.io/v1/boards/airbnb/jobs"

export async function scrapeAirbnbJobs() {
  const jobs: AirbnbJob[] = []

  const res = await fetch(BASE_URL)

  if (!res.ok) {
    throw new Error("Failed to fetch Airbnb jobs")
  }

  const data = await res.json()

  for (const job of data.jobs) {
    jobs.push({
      id: job.id.toString(),
      title: job.title,
      location: job.location.name,
      url: job.absolute_url
    })
  }

  return jobs
}
