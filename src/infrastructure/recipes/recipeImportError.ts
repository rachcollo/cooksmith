const messages: Record<string, string> = {
  recipe_not_found:
    'No clearly labelled recipe was found on that page. Add the recipe manually by copying its ingredients and method.',
  incomplete_recipe:
    'That page does not have complete, clearly labelled ingredients and method. Add the recipe manually so nothing is missed.',
  ambiguous_recipe:
    'That page contains more than one possible recipe or section. Try a page with just one recipe, or add it manually.',
  unsupported_layout:
    'Cooksmith could not safely read that recipe layout. Add the recipe manually by copying its ingredients and method.',
  unsupported:
    'Cooksmith could not read a recipe from that page. Try another source or add it manually.',
  unsupported_content_type:
    'That link does not return a web page Cooksmith can read. Use the recipe page URL or add it manually.',
  unavailable:
    'The recipe website could not be reached. Try again later or add the recipe manually.',
  too_large: 'That page is too large to import. Try another source or add the recipe manually.',
  rate_limited: 'Too many import attempts. Wait a minute, then try again.',
  invalid_url: 'Enter a complete public recipe URL beginning with https:// or http://.',
  blocked_url: 'That URL cannot be imported. Use a public recipe website.',
  redirect_limit: 'That link redirects too many times. Paste the final recipe page URL.',
}

export async function recipeImportError(error: unknown): Promise<string> {
  const fallback = 'Cooksmith could not import that page. Try again or add the recipe manually.'
  if (
    !error ||
    typeof error !== 'object' ||
    !('context' in error) ||
    !(error.context instanceof Response)
  )
    return fallback
  const response = error.context
  if (response.status === 401)
    return 'Your session has expired. Sign in again, then retry the import.'
  try {
    const data: unknown = await response.clone().json()
    if (data && typeof data === 'object' && 'error' in data && typeof data.error === 'string')
      return messages[data.error] ?? fallback
  } catch {
    /* Gateways can return non-JSON responses; never expose their bodies. */
  }
  return fallback
}
