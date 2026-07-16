import type { AuthError, Session, User } from '@supabase/supabase-js'
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'

import { resolveInitialSession } from '../../application/auth/initialSession'
import type { InitialAuthState } from '../../application/auth/bootstrapAuth'
import {
  createSupabaseAuthClient,
  type CooksmithSupabaseClient,
} from '../../infrastructure/auth/supabaseAuthClient'
import { useAppConfig } from '../providers/appConfigContext'
import { AuthContext, type AuthContextValue } from './authContext'
import { authErrorMessage } from './authErrors'

function throwIfError(error: AuthError |