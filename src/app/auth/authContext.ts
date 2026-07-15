import type { Session, User } from '@supabase/supabase-js'
import { createContext, useContext } from 'react'

export interface AuthContextValue {
  configured: boolean
  loading: boolean
  session: Session | null
  user: User | null
  signIn(credentials: { email: string; password: string }): Promise<void>
  signUp(credentials: { email: string; password: string }, emailRedirectTo: string): Promise<void>
  sendMagicLink(email: string, emailRedirectTo: string): Promise<void>
  requestPasswordReset(email: string, redirectTo: string): Promise<void>
  updatePassword(password: string): Promise<void>
  refreshSession(): Promise<void>
  signOut(): Promise<void>
}

export const AuthContext = createContext<AuthContextValue | null>(null)

export function useAuth() {
  const value = useContext(AuthContext)
  if (!value) throw new Error('useAuth must be used inside AuthProvider.')
  return value
}
