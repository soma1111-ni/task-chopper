'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

export default function Confirmed() {
  const [status, setStatus] = useState<'checking' | 'success' | 'error'>('checking');
  const [email, setEmail] = useState('');

  useEffect(() => {
    // リンクが無効・期限切れの場合は、URLのハッシュにエラーが入る
    if (window.location.hash.includes('error=')) {
      setStatus('error');
      return;
    }
    // supabaseクライアントがURL内のトークンを読み取り、セッションを作る
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        setEmail(data.session.user.email ?? '');
        setStatus('success');
      } else {
        setStatus('error');
      }
    });
  }, []);

  return (
    <main className="relative min-h-screen p-6">
      <div className="fixed inset-0 bg-[url('/薪割り.jpeg')] bg-cover bg-center bg-fixed bg-no-repeat brightness-30 -z-10" />
      <h1 className="text-2xl font-bold text-center text-white tracking-wide mb-6">
        Task Chopper
      </h1>

      <div className="max-w-sm mx-auto p-6 bg-white rounded-lg shadow text-center space-y-4">
        {status === 'checking' && <p className="text-slate-500 text-sm">確認中...</p>}

        {status === 'success' && (
          <>
            <h2 className="font-bold text-slate-800">メール認証が完了しました</h2>
            {email && <p className="text-xs text-slate-500">{email}</p>}
            <Link
              href="/"
              className="block w-full py-2 bg-slate-800 text-white rounded font-semibold hover:bg-slate-700 transition"
            >
              アプリに戻る
            </Link>
          </>
        )}

        {status === 'error' && (
          <>
            <h2 className="font-bold text-slate-800">認証できませんでした</h2>
            <p className="text-xs text-slate-500">
              リンクの期限が切れているか、すでに認証済みの可能性があります。ログインをお試しください。
            </p>
            <Link
              href="/"
              className="block w-full py-2 bg-slate-800 text-white rounded font-semibold hover:bg-slate-700 transition"
            >
              ログイン画面へ
            </Link>
          </>
        )}
      </div>
    </main>
  );
}