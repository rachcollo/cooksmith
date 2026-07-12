import { useState } from 'react'
import { Check, Mail } from 'lucide-react'
import { supabase, supabaseConfigured } from './supabase'

export function Auth(){
 const [email,setEmail]=useState(''); const [sent,setSent]=useState(false); const [error,setError]=useState(''); const [busy,setBusy]=useState(false)
 const submit=async(e:React.FormEvent)=>{e.preventDefault();if(!email)return;setBusy(true);setError('');const {error}=await supabase.auth.signInWithOtp({email,options:{emailRedirectTo:window.location.origin}});setBusy(false);if(error)setError(error.message);else setSent(true)}
 if(!supabaseConfigured)return <div className="auth-page"><div className="auth-card"><Brand/><p className="eyebrow">ONE TINY SETUP JOB</p><h1>Cooksmith needs its pantry keys.</h1><p>Add your Supabase project URL and publishable key to a <code>.env.local</code> file, then restart the app. No secret keys. We’re not cowboys.</p></div></div>
 return <div className="auth-page"><div className="auth-card"><Brand/>{sent?<div className="sent"><span><Check/></span><p className="eyebrow">CHECK YOUR INBOX</p><h1>Magic link incoming.</h1><p>Click the link we sent to <b>{email}</b>. No password to remember. You’ve got enough going on.</p><button className="text-button" onClick={()=>setSent(false)}>Use a different email</button></div>:<><p className="eyebrow">WELCOME TO COOKSMITH</p><h1>Dinner. Again?</h1><p>Plan the week, use what you’ve got and dodge the 5 pm fridge stare.</p><form onSubmit={submit}><label>Email address<div className="email-field"><Mail size={18}/><input type="email" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com"/></div></label>{error&&<p className="auth-error">Well, that didn’t cook properly: {error}</p>}<button className="primary wide" disabled={busy}>{busy?'Sending…':'Send me a magic link'}</button></form><small>Free to test. No wellness lecture hiding around the corner.</small></>}</div></div>
}
function Brand(){return <div className="auth-brand"><span className="mark">C</span><span>COOKSMITH<small>Forge a better week</small></span></div>}
