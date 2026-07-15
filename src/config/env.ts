export type AppEnvironment = 'development' | 'test' | 'preview' | 'production'

export interface SupabasePublicConfig {
  publishableKey: string
  url: string
}

export interface PublicEnv {
  appEnvironment: AppEnvironment
  buildCommit?: string
  supabase?: SupabasePublicConfig
}

type EnvSource = Record<string, string | boolean | undefined>

const validEnvironments: AppEnvironment[] = ['development', 'test', 'preview', 'production']
const hostedSupabasePattern = /^([a-z0-9]{20})\.supabase\.co$/

function readString(source: EnvSource, key: string) {
  const value = source[key]
  return typeof value === 'string' ? value.trim() : ''
}

function parseSupabaseUrl(rawUrl: string) {
  let url: URL

  try {
    url = new URL(rawUrl)
  } catch {
    throw new Error('VITE_SUPABASE_URL must be a valid URL.')
  }

  const localHost = url.hostname === '127.0.0.1' || url.hostname === 'localhost'
  const hostedMatch = url.hostname.match(hostedSupabasePattern)

  if (localHost && url.protocol !== 'http:') {
    throw new Error('Local Supabase must use an http URL.')
  }

  if (!localHost && url.protocol !== 'https:') {
    throw new Error('Hosted Supabase must use an https URL.')
  }

  return { localHost, projectRef: hostedMatch?.[1], url: url.toString().replace(/\/$/, '') }
}

export function parseProductionProjectRefs(source: EnvSource) {
  return readString(source, 'COOKSMITH_PRODUCTION_SUPABASE_PROJECT_REFS')
    .split(',')
    .map((reference) => reference.trim())
    .filter(Boolean)
}

export function parsePublicEnv(source: EnvSource): PublicEnv {
  const rawEnvironment = readString(source, 'VITE_APP_ENV')
  const appEnvironment = rawEnvironment || 'development'

  if (!validEnvironments.includes(appEnvironment as AppEnvironment)) {
    throw new Error(`VITE_APP_ENV must be one of: ${validEnvironments.join(', ')}.`)
  }

  const rawUrl = readString(source, 'VITE_SUPABASE_URL')
  const publishableKey = readString(source, 'VITE_SUPABASE_PUBLISHABLE_KEY')
  const hasUrl = rawUrl.length > 0
  const hasKey = publishableKey.length > 0

  if (hasUrl !== hasKey) {
    throw new Error(
      'VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY must be configured together.',
    )
  }

  if ((appEnvironment === 'preview' || appEnvironment === 'production') && !hasUrl) {
    throw new Error(`Supabase public configuration is required for ${appEnvironment} builds.`)
  }

  const buildCommit = readString(source, 'VITE_BUILD_COMMIT')
  const parsedUrl = hasUrl ? parseSupabaseUrl(rawUrl) : undefined

  return {
    appEnvironment: appEnvironment as AppEnvironment,
    ...(buildCommit ? { buildCommit } : {}),
    ...(parsedUrl
      ? { supabase: { url: parsedUrl.url, publishableKey } satisfies SupabasePublicConfig }
      : {}),
  }
}

export function validateBuildEnv(source: EnvSource): PublicEnv {
  const vercelEnvironment = readString(source, 'VERCEL_ENV')
  const configuredEnvironment = readString(source, 'VITE_APP_ENV')

  if (
    (vercelEnvironment === 'preview' || vercelEnvironment === 'production') &&
    configuredEnvironment &&
    configuredEnvironment !== vercelEnvironment
  ) {
    throw new Error(`VITE_APP_ENV must be ${vercelEnvironment} for this Vercel deployment.`)
  }

  const resolvedSource =
    !configuredEnvironment &&
    (vercelEnvironment === 'preview' || vercelEnvironment === 'production')
      ? { ...source, VITE_APP_ENV: vercelEnvironment }
      : source
  const config = parsePublicEnv(resolvedSource)
  const productionRefs = parseProductionProjectRefs(source)

  if (config.supabase && config.appEnvironment !== 'production') {
    const { localHost, projectRef } = parseSupabaseUrl(config.supabase.url)

    if (config.appEnvironment === 'preview' && localHost) {
      throw new Error('Preview builds must use the isolated hosted staging Supabase project.')
    }

    if (config.appEnvironment === 'preview' && productionRefs.length === 0) {
      throw new Error(
        'COOKSMITH_PRODUCTION_SUPABASE_PROJECT_REFS is required for preview safety validation.',
      )
    }

    if (projectRef && productionRefs.includes(projectRef)) {
      throw new Error('This non-production build is configured with a denied production project.')
    }
  }

  return config
}

export function loadPublicEnv(source: ImportMetaEnv): PublicEnv {
  return parsePublicEnv(source)
}
