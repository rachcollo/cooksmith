import type { AuthError, Session, User } from '@supabase/supabase-js'
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'

import type { InitialAuthState } from '../../application/auth/bootstrapAuth'
import { recordAuthEvent } from '../../application/auth/authTelemetry'
import type { CooksmithSupabaseClient } from '../../infrastructure/auth/supabaseAuthClient'
import { AuthContext, type AuthContextValue } from './authContext'
import { authErrorMessage } from './authErrors'

function throwIfError(error: AuthError | null) {
  if (error) throw new Error(authErrorMessage(error))
}

export function AuthProvider({
  children,
  client,
  initialAuthState,
}: {
  children: ReactNode
  client: CooksmithSupabaseClient | null
  initialAuthState: InitialAuthState
}) {
  const [session, setSession] = useState<Session | null>(initialAuthState.session)
  const [user, setUser] = useState<User | null>(initialAuthState.user)

  useEffect(() => {
    if (!client) return undefined

    const { data: listener } = client.auth.onAuthStateChange((event, nextSession) => {
      if (event === 'INITIAL_SESSION') return
      setSession(nextSession)
      setUser(nextSession?.user ?? null)
    })

    return () => listener.subscription.unsubscribe()
  }, [client])

  const requireClient = useCallback(() => {
    if (!client) throw new Error('Authentication is not configured for this environment.')
    return client
  }, [client])

  const value = useMemo<AuthContextValue>(
    () => ({
      client,
      configured: Boolean(client),
      loading: false,
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
        const result = await requireClient().auth.signInWithOtp({
          email,
          options: { emailRedirectTo, shouldCreateUser: true },
        })
        recordAuthEvent({ name: 'email_requested', outcome: result.error ? 'failed' : 'accepted' })
        throwIfError(result.error)
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
    [client, requireClient, session, user],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
