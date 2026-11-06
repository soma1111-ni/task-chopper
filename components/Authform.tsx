'use client';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function AuthForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } =
      mode === 'login'
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password });
    setBusy(false);

    if (error) alert(error.message);
    else if (mode === 'signup') alert('登録しました。確認メールが届く場合は認証してください。');
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-sm mx-auto p-6 bg-white rounded-lg shadow space-y-3">
      <h2 className="font-bold text-slate-800 text-center">
        {mode === 'login' ? 'ログイン' : 'アカウント作成'}
      </h2>
      <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
        placeholder="メールアドレス" required
        className="w-full p-2 border border-gray-300 rounded text-slate-800" />
      <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
        placeholder="パスワード（6文字以上）" required minLength={6}
        className="w-full p-2 border border-gray-300 rounded text-slate-800" />
      <button type="submit" disabled={busy}
        className="w-full py-2 bg-slate-800 text-white rounded font-semibold disabled:opacity-50">
        {mode === 'login' ? 'ログイン' : '登録'}
      </button>
      <button type="button" onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
        className="w-full text-xs text-slate-500 hover:underline">
        {mode === 'login' ? 'アカウントを作る' : 'ログインへ戻る'}
      </button>
    </form>
  );
}