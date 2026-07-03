import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

function bindStorage(userId) {
  window.storage = {
    get: async (key) => {
      const { data, error } = await supabase
        .from('user_storage')
        .select('value')
        .eq('user_id', userId)
        .eq('key', key)
        .maybeSingle();
      if (error) return { value: null };
      return { value: data ? data.value : null };
    },
    set: async (key, value) => {
      const { error } = await supabase
        .from('user_storage')
        .upsert({ user_id: userId, key, value, updated_at: new Date().toISOString() }, { onConflict: 'user_id,key' });
      return { ok: !error };
    },
  };
}

export default function AuthGate({ children }) {
  const [session, setSession] = useState(undefined); // undefined = loading, null = signed out

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  if (session === undefined) {
    return <Centered>Loading…</Centered>;
  }
  if (!session) {
    return <AuthForm />;
  }

  bindStorage(session.user.id);
  return children(session.user);
}

function Centered({ children }) {
  return (
    <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#FAF8F5', color: '#9C9589', fontFamily: 'Inter, sans-serif' }}>
      {children}
    </div>
  );
}

function AuthForm() {
  const [mode, setMode] = useState('signin'); // 'signin' | 'signup'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setError(''); setNotice(''); setBusy(true);
    const { error: err } = mode === 'signin'
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({ email, password });
    setBusy(false);
    if (err) { setError(err.message); return; }
    if (mode === 'signup') setNotice('Check your email to confirm your account, then sign in.');
  }

  const inputStyle = { width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #E4DFD6', outline: 'none', fontSize: 14, marginBottom: 12 };

  return (
    <Centered>
      <form onSubmit={submit} style={{ width: 320, background: '#fff', padding: 32, borderRadius: 14, boxShadow: '0 8px 30px rgba(0,0,0,.08)' }}>
        <h1 style={{ fontFamily: 'Fraunces, serif', fontSize: 24, margin: '0 0 4px', color: '#2B2620' }}>Punctual</h1>
        <p style={{ fontSize: 13, color: '#9C9589', margin: '0 0 20px' }}>{mode === 'signin' ? 'Sign in to your tasks' : 'Create an account'}</p>

        <input type="email" required placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} style={inputStyle} />
        <input type="password" required minLength={6} placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} style={inputStyle} />

        {error && <p style={{ color: '#D6492F', fontSize: 13, marginBottom: 12 }}>{error}</p>}
        {notice && <p style={{ color: '#3F8F6F', fontSize: 13, marginBottom: 12 }}>{notice}</p>}

        <button type="submit" disabled={busy} style={{ width: '100%', padding: '11px 0', borderRadius: 8, border: 'none', background: '#D6492F', color: '#fff', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>
          {busy ? 'Please wait…' : mode === 'signin' ? 'Sign in' : 'Sign up'}
        </button>

        <button type="button" onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setError(''); setNotice(''); }} style={{ width: '100%', marginTop: 12, background: 'none', border: 'none', color: '#9C9589', fontSize: 13, cursor: 'pointer' }}>
          {mode === 'signin' ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
        </button>
      </form>
    </Centered>
  );
}
