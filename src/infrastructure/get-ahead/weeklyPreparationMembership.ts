type MembershipVerificationInput = {
  supabaseUrl: string
  anonKey: string
  authorisation: string
  householdId: string
  fetcher?: typeof fetch
}

export async function verifyActiveHouseholdMember({
  supabaseUrl,
  anonKey,
  authorisation,
  householdId,
  fetcher = fetch,
}: MembershipVerificationInput) {
  const response = await fetcher(`${supabaseUrl}/rest/v1/rpc/is_active_household_member`, {
    method: 'POST',
    headers: {
      apikey: anonKey,
      authorization: authorisation,
      'accept-profile': 'cooksmith',
      'content-profile': 'cooksmith',
      'content-type': 'application/json',
    },
    body: JSON.stringify({ target_household_id: householdId }),
    signal: AbortSignal.timeout(5_000),
  })
  if (!response.ok) throw new Error('membership_verification_unavailable')
  return (await response.json()) === true
}
