'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

type Task = {
  id: string;
  title: string;
  is_completed: boolean;
  created_at: string;
};

export default function Home() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(false);

  // 1. タスク一覧の取得
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

  // 2. タスクの新規登録
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setLoading(true);
    const { error } = await supabase.from('tasks').insert([{ title, is_completed: false }]);

    if (error) {
      alert('登録に失敗しました: ' + error.message);
    } else {
      setTitle('');
      fetchTasks();
    }
    setLoading(false);
  };

  // 3. 完了状態のトグル（切り替え）
  const toggleTask = async (id: string, currentStatus: boolean) => {
    // 画面側を先に応答させて打感（UX）を良くする
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, is_completed: !currentStatus } : t))
    );

    const { error } = await supabase
      .from('tasks')
      .update({ is_completed: !currentStatus })
      .eq('id', id);

    if (error) {
      alert('更新に失敗しました: ' + error.message);
      fetchTasks(); // エラー時は元に戻す
    }
  };

  // 4. タスクの削除
  const deleteTask = async (id: string) => {
    if (!confirm('この課題を削除しますか？')) return;

    setTasks((prev) => prev.filter((t) => t.id !== id));

    const { error } = await supabase.from('tasks').delete().eq('id', id);

    if (error) {
      alert('削除に失敗しました: ' + error.message);
      fetchTasks(); // エラー時は元に戻す
    }
  };

  return (
    <main className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6 text-center text-slate-800">
        🪓 Task Chopper
      </h1>

      {/* 登録フォーム */}
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

      {/* タスク一覧 */}
      <section>
        <h2 className="text-lg font-semibold mb-4 text-gray-700">登録された課題一覧</h2>
        {tasks.length === 0 ? (
          <p className="text-gray-400 text-center py-8">課題はまだ登録されていません。</p>
        ) : (
          <ul className="space-y-3">
            {tasks.map((task) => (
              <li
                key={task.id}
                className={`p-4 border rounded-lg shadow-sm flex items-center justify-between transition ${
                  task.is_completed ? 'bg-gray-50 border-gray-200' : 'bg-white border-gray-200'
                }`}
              >
                <div className="flex items-center gap-3 flex-1 mr-4">
                  <input
                    type="checkbox"
                    checked={task.is_completed}
                    onChange={() => toggleTask(task.id, task.is_completed)}
                    className="w-5 h-5 accent-slate-800 cursor-pointer"
                  />
                  <span
                    className={`font-medium ${
                      task.is_completed ? 'line-through text-gray-400' : 'text-gray-800'
                    }`}
                  >
                    {task.title}
                  </span>
                </div>

                <button
                  onClick={() => deleteTask(task.id)}
                  className="px-3 py-1 text-sm text-red-600 hover:bg-red-50 rounded transition"
                >
                  削除
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}