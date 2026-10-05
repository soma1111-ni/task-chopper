'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

type Subtask = {
  id: string;
  task_id: string;
  title: string;
  is_completed: boolean;
  created_at: string;
};

type Task = {
  id: string;
  title: string;
  is_completed: boolean;
  created_at: string;
  subtasks?: Subtask[];
};

export default function Home() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(false);

  // 展開中のタスクIDを保持
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);

  // サブタスク入力用の状態
  const [subtaskTitle, setSubtaskTitle] = useState('');
  const [subtaskLoading, setSubtaskLoading] = useState(false);

  // 編集中のサブタスク状態
  const [editingSubtaskId, setEditingSubtaskId] = useState<string | null>(null);
  const [editingSubtaskTitle, setEditingSubtaskTitle] = useState('');

  // 1. タスクおよびサブタスクの一覧取得
  const fetchTasks = async () => {
    const { data: tasksData, error: tasksError } = await supabase
      .from('tasks')
      .select('*')
      .order('created_at', { ascending: false });

    if (tasksError) {
      console.error('タスク取得エラー:', tasksError);
      return;
    }

    const { data: subtasksData, error: subtasksError } = await supabase
      .from('subtasks')
      .select('*')
      .order('created_at', { ascending: true });

    if (subtasksError) {
      console.error('サブタスク取得エラー:', subtasksError);
      return;
    }

    const combinedTasks = tasksData.map((task) => ({
      ...task,
      subtasks: subtasksData?.filter((sub) => sub.task_id === task.id) || [],
    }));

    setTasks(combinedTasks);
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  // 2. 親タスク新規登録
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

  // 3. 親タスクの完了トグル
  const toggleTask = async (id: string, currentStatus: boolean) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, is_completed: !currentStatus } : t))
    );

    const { error } = await supabase
      .from('tasks')
      .update({ is_completed: !currentStatus })
      .eq('id', id);

    if (error) {
      alert('更新に失敗しました: ' + error.message);
      fetchTasks();
    }
  };

  // 4. 親タスク削除
  const deleteTask = async (id: string) => {
    if (!confirm('この課題と含まれるサブタスクをすべて削除しますか？')) return;

    setTasks((prev) => prev.filter((t) => t.id !== id));

    const { error } = await supabase.from('tasks').delete().eq('id', id);

    if (error) {
      alert('削除に失敗しました: ' + error.message);
      fetchTasks();
    }
  };

  // --- サブタスク操作 ---

  // 5. サブタスク追加
  const handleAddSubtask = async (taskId: string, e: React.FormEvent) => {
    e.preventDefault();
    if (!subtaskTitle.trim()) return;

    setSubtaskLoading(true);
    const { error } = await supabase.from('subtasks').insert([
      {
        task_id: taskId,
        title: subtaskTitle,
        is_completed: false,
      },
    ]);

    if (error) {
      alert('サブタスク追加エラー: ' + error.message);
    } else {
      setSubtaskTitle('');
      fetchTasks();
    }
    setSubtaskLoading(false);
  };

  // 6. サブタスク完了トグル
  const toggleSubtask = async (subtaskId: string, currentStatus: boolean) => {
    setTasks((prev) =>
      prev.map((task) => ({
        ...task,
        subtasks: task.subtasks?.map((sub) =>
          sub.id === subtaskId ? { ...sub, is_completed: !currentStatus } : sub
        ),
      }))
    );

    const { error } = await supabase
      .from('subtasks')
      .update({ is_completed: !currentStatus })
      .eq('id', subtaskId);

    if (error) {
      alert('サブタスク更新エラー: ' + error.message);
      fetchTasks();
    }
  };

  // 7. サブタスク編集保存
  const handleUpdateSubtask = async (subtaskId: string) => {
    if (!editingSubtaskTitle.trim()) return;

    const { error } = await supabase
      .from('subtasks')
      .update({ title: editingSubtaskTitle })
      .eq('id', subtaskId);

    if (error) {
      alert('サブタスク更新エラー: ' + error.message);
    } else {
      setEditingSubtaskId(null);
      setEditingSubtaskTitle('');
      fetchTasks();
    }
  };

  // 8. サブタスク削除
  const deleteSubtask = async (subtaskId: string) => {
    const { error } = await supabase.from('subtasks').delete().eq('id', subtaskId);

    if (error) {
      alert('サブタスク削除エラー: ' + error.message);
    } else {
      fetchTasks();
    }
  };

  return (
    // 背景画像設定
    <main className="relative min-h-screen bg-[url('/薪割り.jpeg')] bg-cover bg-center bg-fixed bg-no-repeat p-6 text-white">
      {/* 黒色の半透明オーバーレイ（白文字を見やすくするための黒フィルター） */}
      <div className="fixed inset-0 bg-black/60 backdrop-blur-xs -z-10" />

      {/* コンテンツエリア */}
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold mb-6 text-center text-white drop-shadow">
           Task Chopper
        </h1>

        {/* 課題登録フォーム */}
        <form onSubmit={handleSubmit} className="flex gap-2 mb-8">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="大きな課題を入力（例：期末レポート 3,000字）"
            className="flex-1 p-3 border border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-400 bg-slate-900/80 text-white placeholder-slate-400"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading || !title.trim()}
            className="px-6 py-3 bg-white text-slate-900 font-bold rounded-lg hover:bg-slate-200 disabled:opacity-50 transition"
          >
            {loading ? '追加中...' : '追加'}
          </button>
        </form>

        {/* 課題一覧 */}
        <section>
          <h2 className="text-lg font-semibold mb-4 text-slate-200">登録された課題一覧</h2>
          {tasks.length === 0 ? (
            <p className="text-slate-400 text-center py-8">課題はまだ登録されていません。</p>
          ) : (
            <ul className="space-y-4">
              {tasks.map((task) => {
                const isExpanded = expandedTaskId === task.id;
                const completedSubCount =
                  task.subtasks?.filter((s) => s.is_completed).length || 0;
                const totalSubCount = task.subtasks?.length || 0;

                return (
                  <li
                    key={task.id}
                    className={`border rounded-lg shadow-md transition overflow-hidden ${
                      task.is_completed
                        ? 'bg-slate-900/50 border-slate-700/50'
                        : 'bg-slate-900/80 border-slate-700'
                    }`}
                  >
                    {/* 親タスクヘッダー */}
                    <div className="p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3 flex-1 mr-2">
                        <input
                          type="checkbox"
                          checked={task.is_completed}
                          onChange={() => toggleTask(task.id, task.is_completed)}
                          className="w-5 h-5 accent-slate-400 cursor-pointer"
                        />
                        <span
                          className={`font-medium ${
                            task.is_completed
                              ? 'line-through text-white/40'
                              : 'text-white'
                          }`}
                        >
                          {task.title}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        {/* 分解ボタン / 進捗バッジ */}
                        <button
                          onClick={() =>
                            setExpandedTaskId(isExpanded ? null : task.id)
                          }
                          className="px-3 py-1 text-xs font-semibold rounded-full border border-slate-600 hover:bg-slate-800 text-slate-200 transition flex items-center gap-1"
                        >
                           チョップ（15分分解）
                          {totalSubCount > 0 && (
                            <span className="bg-slate-700 px-1.5 py-0.5 rounded-full text-slate-200">
                              {completedSubCount}/{totalSubCount}
                            </span>
                          )}
                        </button>

                        <button
                          onClick={() => deleteTask(task.id)}
                          className="px-2 py-1 text-xs text-red-400 hover:bg-red-950/50 rounded transition"
                        >
                          削除
                        </button>
                      </div>
                    </div>

                    {/* 階層化表示：サブタスクエリア */}
                    {isExpanded && (
                      <div className="bg-slate-950/80 border-t border-slate-800 p-4 pl-8 space-y-3">
                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                          15分アクション（サブタスク）
                        </h3>

                        {/* サブタスク追加フォーム */}
                        <form
                          onSubmit={(e) => handleAddSubtask(task.id, e)}
                          className="flex gap-2"
                        >
                          <input
                            type="text"
                            value={subtaskTitle}
                            onChange={(e) => setSubtaskTitle(e.target.value)}
                            placeholder="15分で終わる作業（例：目次案をメモ帳に書く）"
                            className="flex-1 p-2 text-sm border border-slate-700 rounded focus:outline-none focus:ring-1 focus:ring-slate-400 bg-slate-900 text-white placeholder-slate-500"
                            disabled={subtaskLoading}
                          />
                          <button
                            type="submit"
                            disabled={subtaskLoading || !subtaskTitle.trim()}
                            className="px-4 py-2 bg-slate-200 text-slate-900 text-sm font-medium rounded hover:bg-white disabled:opacity-50 transition"
                          >
                            追加
                          </button>
                        </form>

                        {/* サブタスク一覧 */}
                        {task.subtasks && task.subtasks.length > 0 ? (
                          <ul className="space-y-2 mt-2">
                            {task.subtasks.map((sub) => (
                              <li
                                key={sub.id}
                                className="p-2.5 bg-slate-900/90 border border-slate-800 rounded flex items-center justify-between text-sm"
                              >
                                {editingSubtaskId === sub.id ? (
                                  // 編集モード
                                  <div className="flex items-center gap-2 flex-1 mr-2">
                                    <input
                                      type="text"
                                      value={editingSubtaskTitle}
                                      onChange={(e) =>
                                        setEditingSubtaskTitle(e.target.value)
                                      }
                                      className="flex-1 p-1 border border-slate-600 rounded text-sm focus:outline-none bg-slate-800 text-white"
                                    />
                                    <button
                                      onClick={() => handleUpdateSubtask(sub.id)}
                                      className="text-xs text-green-400 hover:underline"
                                    >
                                      保存
                                    </button>
                                    <button
                                      onClick={() => setEditingSubtaskId(null)}
                                      className="text-xs text-slate-400 hover:underline"
                                    >
                                      キャンセル
                                    </button>
                                  </div>
                                ) : (
                                  // 通常表示モード
                                  <>
                                    <div className="flex items-center gap-2.5 flex-1 mr-2">
                                      <input
                                        type="checkbox"
                                        checked={sub.is_completed}
                                        onChange={() =>
                                          toggleSubtask(sub.id, sub.is_completed)
                                        }
                                        className="w-4 h-4 accent-slate-400 cursor-pointer"
                                      />
                                      <span
                                        className={
                                          sub.is_completed
                                            ? 'line-through text-white/40'
                                            : 'text-slate-100'
                                        }
                                      >
                                        {sub.title}
                                      </span>
                                    </div>

                                    <div className="flex items-center gap-2">
                                      <button
                                        onClick={() => {
                                          setEditingSubtaskId(sub.id);
                                          setEditingSubtaskTitle(sub.title);
                                        }}
                                        className="text-xs text-slate-400 hover:text-white"
                                      >
                                        編集
                                      </button>
                                      <button
                                        onClick={() => deleteSubtask(sub.id)}
                                        className="text-xs text-red-400 hover:underline"
                                      >
                                        削除
                                      </button>
                                    </div>
                                  </>
                                )}
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-xs text-slate-500 italic">
                            サブタスクはまだありません。15分でできる小さな作業を追加してみましょう！
                          </p>
                        )}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}