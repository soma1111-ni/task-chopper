'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

type Task = {
  id: string;
  title: string;
  created_at: string;
};

export default function Home() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(false);

  const fetchTasks = async () => {
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('取得エラー:', error);
    } else if (data) {
      setTasks(data);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setLoading(true);
    const { error } = await supabase.from('tasks').insert([{ title }]);

    if (error) {
      alert('登録に失敗しました: ' + error.message);
    } else {
      setTitle('');
      fetchTasks();
    }
    setLoading(false);
  };

  return (
    <main className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6 text-center text-slate-800">
        🪓 Task Chopper (第1週プロトタイプ)
      </h1>

      <form onSubmit={handleSubmit} className="flex gap-2 mb-8">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="大きな課題を入力（例：期末レポート 3,000字）"
          className="flex-1 p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500"
          disabled={loading}
        />
        <button
          type="submit"
          disabled={loading || !title.trim()}
          className="px-6 py-3 bg-slate-800 text-white font-semibold rounded-lg hover:bg-slate-700 disabled:opacity-50 transition"
        >
          {loading ? '追加中...' : '追加'}
        </button>
      </form>

      <section>
        <h2 className="text-lg font-semibold mb-4 text-gray-700">登録された課題一覧</h2>
        {tasks.length === 0 ? (
          <p className="text-gray-400 text-center py-8">課題はまだ登録されていません。</p>
        ) : (
          <ul className="space-y-3">
            {tasks.map((task) => (
              <li
                key={task.id}
                className="p-4 bg-white border border-gray-200 rounded-lg shadow-sm flex justify-between items-center"
              >
                <span className="font-medium text-gray-800">{task.title}</span>
                <span className="text-xs text-gray-400">
                  {new Date(task.created_at).toLocaleDateString()}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}