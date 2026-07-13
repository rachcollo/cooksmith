export type AppEnvironment = 'development' | 'test' | 'preview' | 'production'

export interface PublicEnv {
  appEnvironment: AppEnvironment
  buildCommit?: string
}

type EnvSource = Record<string, string | boolean | undefined>

const validEnvironments: AppEnvironment[] = ['development', 'test', 'preview', 'production']

export function parsePublicEnv(source: EnvSource): PublicEnv {
  const rawEnvironment = source.VITE_APP_ENV
  const appEnvironment =
    typeof rawEnvironment === 'string' && rawEnvironment.length > 0 ? rawEnvironment : 'development'

  if (!validEnvironments.includes(appEnvironment as AppEnvironment)) {
    throw new Error(
      `VITE_APP_ENV must be one of: ${validEnvironments.join(', ')}. Received: ${appEnvironment}`,
    )
  }

  const rawCommit = source.VITE_BUILD_COMMIT
  const buildCommit = typeof rawCommit === 'string' ? rawCommit.trim() : ''

  return {
    appEnvironment: appEnvironment as AppEnvironment,
    ...(buildCommit ? { buildCommit } : {}),
  }
}

export function loadPublicEnv(source: ImportMetaEnv): PublicEnv {
  return parsePublicEnv(source)
}
