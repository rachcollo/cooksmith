import type { AuthError, Session, User } from '@supabase/supabase-js'
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'

import { resolveInitialSession } from '../../application/auth/initialSession'
import {
  createSupabaseAuthClient,
  type CooksmithSupabaseClient,
} from '../../infrastructure/auth/supabaseAuthClient'
import { useAppConfig } from '../providers/appConfigContext'
import { AuthContext, type AuthContextValue } from './authContext'
import { authErrorMessage } from './authErrors'

function throwIfError(error: AuthError | null) {
  if (error) throw new Error(authErrorMessage(error))
}

export function AuthProvider({
  children,
  client: suppliedClient,
}: {
  children: ReactNode
  client?: CooksmithSupabaseClient | null
}) {
  const config = useAppConfig()
  const client = useMemo(
    () => (suppliedClient === undefined ? createSupabaseAuthClient(config) : suppliedClient),
    [config, suppliedClient],
  )
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(Boolean(client))
  const initialSession = useRef<{
    client: CooksmithSupabaseClient
    promise: ReturnType<typeof resolveInitialSession>
  } | null>(null)

  useEffect(() => {
    let active = true
    if (!client) {
      return
    }

    if (initialSession.current?.client !== client) {
      initialSession.current = { client, promise: resolveInitialSession(client) }
    }

    void initialSession.current.promise.then(async ({ session: restoredSession, error }) => {
      if (!active) return
      if (error || !restoredSession) {
        setSession(null)
        setUser(null)
        setLoading(false)
        return
      }
      const validated = await client.auth.getUser()
      if (!active) return
      if (validated.error || !validated.data.user) {
        await client.auth.signOut({ scope: 'local' })
        setSession(null)
        setUser(null)
      } else {
        setSession(restoredSession)
        setUser(validated.data.user)
      }
      setLoading(false)
    })

    const { data: listener } = client.auth.onAuthStateChange((_event, nextSession) => {
      if (!active) return
      setSession(nextSession)
      setUser(nextSession?.user ?? null)
      setLoading(false)
    })
    return () => {
      active = false
      listener.subscription.unsubscribe()
    }
  }, [client])

  const requireClient = useCallback(() => {
    if (!client) throw new Error('Authentication is not configured for this environment.')
    return client
  }, [client])

  const value = useMemo<AuthContextValue>(
    () => ({
      configured: Boolean(client),
      loading,
      session,
      user,
      async signIn({ email, password }) {
        throwIfError((await requireClient().auth.signInWithPassword({ email, password })).error)
      },
      async signUp({ email, password }, emailRedirectTo) {
        throwIfError(
          (await requireClient().auth.signUp({ email, password, options: { emailRedirectTo } }))
            .error,
        )
      },
      async sendMagicLink(email, emailRedirectTo) {
        throwIfError(
          (
            await requireClient().auth.signInWithOtp({
              email,
              options: { emailRedirectTo, shouldCreateUser: false },
            })
          ).error,
        )
      },
      async requestPasswordReset(email, redirectTo) {
        throwIfError(
          (await requireClient().auth.resetPasswordForEmail(email, { redirectTo })).error,
        )
      },
      async updatePassword(password) {
        throwIfError((await requireClient().auth.updateUser({ password })).error)
      },
      async refreshSession() {
        const result = await requireClient().auth.refreshSession()
        throwIfError(result.error)
        setSession(result.data.session)
        setUser(result.data.user)
      },
      async signOut() {
        throwIfError((await requireClient().auth.signOut()).error)
      },
    }),
    [client, loading, requireClient, session, user],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
