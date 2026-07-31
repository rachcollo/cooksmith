type HouseholdDataRequest = {
  supabaseUrl: string
  anonKey: string
  authorisation: string
  path: string
  fetcher?: typeof fetch
}

export async function fetchWeeklyPreparationHouseholdData<T>({
  supabaseUrl,
  anonKey,
  authorisation,
  path,
  fetcher = fetch,
}: HouseholdDataRequest): Promise<T> {
  const response = await fetcher(`${supabaseUrl}/rest/v1/${path}`, {
    headers: {
      apikey: anonKey,
      authorization: authorisation,
      'accept-profile': 'cooksmith',
      'content-profile': 'cooksmith',
      'content-type': 'application/json',
    },
    signal: AbortSignal.timeout(8_000),
  })
  if (!response.ok) throw new Error('household_data_unavailable')
  return (await response.json()) as T
}
