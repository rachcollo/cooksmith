import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { Link, Navigate, useLocation, useNavigate, useSearchParams } from 'react-router-dom'

import {
  authRedirectUrl,
  emailAuthRedirectUrl,
  safeReturnPath,
} from '../../application/auth/redirects'
import { useAuth } from '../../app/auth/authContext'
import { Button } from '../../components/ui/Button'
import { FeedbackState } from '../../components/ui/FeedbackState'
import { TextField } from '../../components/ui/TextField'

function AuthHeading({ title, children }: { title: string; children: ReactNode }) {
  useEffect(() => {
    document.title = `${title} | Cooksmith`
  }, [title])
  return (
    <>
      <h1>{title}</h1>
      <p>{children}</p>
    </>
  )
}
function ErrorMessage({ message }: { message: string }) {
  return message ? (
    <FeedbackState tone="error" title="We could not complete that" message={message} />
  ) : null
}

export function WelcomePage() {
  const [params] = useSearchParams()
  const suffix = `?returnTo=${encodeURIComponent(safeReturnPath(params.get('returnTo')))}`
  return (
    <>
      <AuthHeading title="Welcome to Cooksmith">
        Sign in to return to your calm fortnightly cooking plan.
      </AuthHeading>
      <div className="auth-actions">
        <Link className="button button-primary" to={`/auth/magic-link${suffix}`}>
          Continue with email
        </Link>
        <Link className="button button-secondary" to={`/auth/sign-in${suffix}`}>
          Sign in with a password
        </Link>
        <Link to={`/auth/create-account${suffix}`}>Create an account</Link>
      </div>
    </>
  )
}

function useAuthForm() {
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  return {
    error,
    busy,
    run: async (work: () => Promise<void>) => {
      setBusy(true)
      setError('')
      try {
        await work()
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Please try again.')
      } finally {
        setBusy(false)
      }
    },
  }
}

export function SignInPage() {
  const auth = useAuth(),
    form = useAuthForm(),
    navigate = useNavigate(),
    [params] = useSearchParams()
  const [email, setEmail] = useState(''),
    [password, setPassword] = useState('')
  async function submit(event: FormEvent) {
    event.preventDefault()
    await form.run(async () => {
      await auth.signIn({ email, password })
      navigate(safeReturnPath(params.get('returnTo')), { replace: true })
    })
  }
  return (
    <>
      <AuthHeading title="Sign in">
        Use the email and password for your Cooksmith account.
      </AuthHeading>
      <ErrorMessage message={form.error} />
      <form onSubmit={submit} className="auth-form">
        <TextField
          label="Email"
          name="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <TextField
          label="Password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <Button type="submit" busy={form.busy}>
          Sign in
        </Button>
      </form>
      <p>
        <Link to="/auth/forgot-password">Forgot password?</Link> ·{' '}
        <Link to="/auth/magic-link">Continue with email instead</Link>
      </p>
    </>
  )
}

export function CreateAccountPage() {
  const auth = useAuth(),
    form = useAuthForm(),
    [params] = useSearchParams()
  const [email, setEmail] = useState(''),
    [password, setPassword] = useState(''),
    [sent, setSent] = useState(false)
  async function submit(e: FormEvent) {
    e.preventDefault()
    await form.run(async () => {
      await auth.signUp({ email, password }, emailAuthRedirectUrl(params.get('returnTo')))
      setSent(true)
    })
  }
  if (sent)
    return (
      <FeedbackState
        tone="success"
        title="Check your email"
        message="Use the verification link we sent to finish creating your account."
      />
    )
  return (
    <>
      <AuthHeading title="Create account">
        Create your login now. Profile and household setup comes next, in a later milestone.
      </AuthHeading>
      <ErrorMessage message={form.error} />
      <form onSubmit={submit} className="auth-form">
        <TextField
          label="Email"
          name="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <TextField
          label="Password"
          hint="Use at least 10 characters."
          minLength={10}
          name="password"
          type="password"
          autoComplete="new-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <Button type="submit" busy={form.busy}>
          Create account
        </Button>
      </form>
    </>
  )
}

export function MagicLinkPage() {
  const [params] = useSearchParams()
  return (
    <EmailActionPage
      title="Continue with email"
      description="Enter your email and we’ll send a secure link to continue."
      action="Continue with email"
      success="If this address can receive a Cooksmith email, use the link to continue."
      perform={(auth, email) =>
        auth.sendMagicLink(email, emailAuthRedirectUrl(params.get('returnTo')))
      }
    />
  )
}
export function ForgotPasswordPage() {
  return (
    <EmailActionPage
      title="Reset your password"
      description="We’ll email you a secure password reset link."
      action="Send reset link"
      success="Check your email for your password reset link."
      perform={(auth, email) =>
        auth.requestPasswordReset(email, authRedirectUrl('/auth/reset-password'))
      }
    />
  )
}

function EmailActionPage({
  title,
  description,
  action,
  success,
  perform,
}: {
  title: string
  description: string
  action: string
  success: string
  perform: (auth: ReturnType<typeof useAuth>, email: string) => Promise<void>
}) {
  const auth = useAuth(),
    form = useAuthForm(),
    [email, setEmail] = useState(''),
    [sent, setSent] = useState(false)
  async function submit(e: FormEvent) {
    e.preventDefault()
    await form.run(async () => {
      await perform(auth, email)
      setSent(true)
    })
  }
  if (sent)
    return (
      <FeedbackState
        tone="success"
        title="Check your email"
        message={`${success} If it does not arrive, wait a minute before trying again.`}
      />
    )
  return (
    <>
      <AuthHeading title={title}>{description}</AuthHeading>
      <ErrorMessage message={form.error} />
      <form className="auth-form" onSubmit={submit}>
        <TextField
          label="Email"
          name="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <Button type="submit" busy={form.busy}>
          {action}
        </Button>
      </form>
    </>
  )
}

export function ResetPasswordPage() {
  const auth = useAuth(),
    form = useAuthForm(),
    navigate = useNavigate(),
    [password, setPassword] = useState('')
  if (!auth.loading && !auth.session) return <Navigate replace to="/auth/forgot-password" />
  async function submit(e: FormEvent) {
    e.preventDefault()
    await form.run(async () => {
      await auth.updatePassword(password)
      navigate('/', { replace: true })
    })
  }
  return (
    <>
      <AuthHeading title="Choose a new password">Your reset link has been verified.</AuthHeading>
      <ErrorMessage message={form.error} />
      <form className="auth-form" onSubmit={submit}>
        <TextField
          label="New password"
          name="password"
          type="password"
          minLength={10}
          autoComplete="new-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <Button type="submit" busy={form.busy}>
          Save new password
        </Button>
      </form>
    </>
  )
}

export function EmailConfirmationPage() {
  const auth = useAuth(),
    location = useLocation()
  if (auth.loading) return <p role="status">Confirming your email…</p>
  return auth.user ? (
    <>
      <FeedbackState
        tone="success"
        title="Email confirmed"
        message="Your Cooksmith sign-in is ready."
      />
      <Link
        className="button button-primary"
        to={safeReturnPath(new URLSearchParams(location.search).get('returnTo'))}
      >
        Continue to Cooksmith
      </Link>
    </>
  ) : (
    <>
      <FeedbackState
        tone="info"
        title="This link can’t be used"
        message="It may have expired or already been used. You can send a fresh email to continue."
      />
      <Link className="button button-primary" replace to="/auth/magic-link">
        Send a new email
      </Link>
      <Link replace to="/auth/sign-in">
        Sign in with a password
      </Link>
    </>
  )
}
