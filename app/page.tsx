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

  // タイマー機能の状態管理
  const [activeTimerSubtask, setActiveTimerSubtask] = useState<Subtask | null>(null);
  const [timeLeft, setTimeLeft] = useState<number>(15 * 60);
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(false);

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

  // デスクトップ通知を送る関数（画面端へのポップアップ表示）
  const sendDesktopNotification = (titleText: string, bodyText: string) => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'granted') {
        new Notification(titleText, { body: bodyText });
      }
    }
  };

  // タイマーのカウントダウン & 完了自動処理
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    if (isTimerRunning && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0 && isTimerRunning && activeTimerSubtask) {
      setIsTimerRunning(false);
      handleTimerComplete(activeTimerSubtask.id);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isTimerRunning, timeLeft, activeTimerSubtask]);

  // タブのタイトルに残り時間を表示する処理
  useEffect(() => {
    if (isTimerRunning && activeTimerSubtask) {
      document.title = `(${formatTime(timeLeft)}) Task Chopper`;
    } else {
      document.title = 'Task Chopper';
    }
  }, [isTimerRunning, timeLeft, activeTimerSubtask]);

  // タイマー完了時の処理
  const handleTimerComplete = async (subtaskId: string) => {
    // 1. デスクトップ通知のみを実行（画面右端に表示）
    sendDesktopNotification(
      '15分タイマー完了',
      `「${activeTimerSubtask?.title || 'サブタスク'}」が自動完了しました！`
    );

    // 2. 画面側の表示を即時完了に更新
    setTasks((prev) =>
      prev.map((task) => ({
        ...task,
        subtasks: task.subtasks?.map((sub) =>
          sub.id === subtaskId ? { ...sub, is_completed: true } : sub
        ),
      }))
    );

    // 3. Supabase上のデータ更新
    const { error } = await supabase
      .from('subtasks')
      .update({ is_completed: true })
      .eq('id', subtaskId);

    if (error) {
      alert('サブタスクの自動完了更新に失敗しました: ' + error.message);
      fetchTasks();
    } else {
      setActiveTimerSubtask(null);
      fetchTasks();
    }
  };

  // タイマー開始処理
  const startTimerForSubtask = (subtask: Subtask, seconds: number = 15 * 60) => {
    // ブラウザに通知許可をリクエスト
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'default') {
        Notification.requestPermission();
      }
    }

    setActiveTimerSubtask(subtask);
    setTimeLeft(seconds);
    setIsTimerRunning(true);
  };

  // 秒数を mm:ss 形式に整形
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  // 親タスク新規登録
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

  // 親タスクの完了トグル
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

  // 親タスク削除
  const deleteTask = async (id: string) => {
    if (!confirm('この課題と含まれるサブタスクをすべて削除しますか？')) return;

    setTasks((prev) => prev.filter((t) => t.id !== id));

    const { error } = await supabase.from('tasks').delete().eq('id', id);

    if (error) {
      alert('削除に失敗しました: ' + error.message);
      fetchTasks();
    }
  };

  // サブタスク追加
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

  // サブタスク完了トグル
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

  // サブタスク編集保存
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

  // サブタスク削除
  const deleteSubtask = async (subtaskId: string) => {
    const { error } = await supabase.from('subtasks').delete().eq('id', subtaskId);

    if (error) {
      alert('サブタスク削除エラー: ' + error.message);
    } else {
      fetchTasks();
    }
  };

  return (
    <main className="relative min-h-screen p-6">
      {/* 背景画像：明るさ30% (brightness-30) */}
      <div className="fixed inset-0 bg-[url('/bg.jpg')] bg-cover bg-center bg-fixed bg-no-repeat brightness-30 -z-10" />

      {/* コンテンツエリア */}
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold mb-6 text-center text-white tracking-wide">
          Task Chopper
        </h1>

        {/* 集中タイマーコントロールパネル */}
        {activeTimerSubtask && (
          <div className="mb-6 p-4 bg-white rounded-lg shadow-lg border border-slate-200 text-center">
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
              集中実行中のサブタスク
            </div>
            <div className="text-base font-semibold text-slate-800 mb-3">
              {activeTimerSubtask.title}
            </div>
            <div className="text-4xl font-mono font-bold text-slate-900 mb-4 tracking-wider">
              {formatTime(timeLeft)}
            </div>
            <div className="flex justify-center gap-2">
              <button
                onClick={() => setIsTimerRunning(!isTimerRunning)}
                className="px-4 py-2 bg-slate-800 text-white text-sm font-semibold rounded hover:bg-slate-700 transition"
              >
                {isTimerRunning ? '一時停止' : '再開'}
              </button>

              <button
                onClick={() => startTimerForSubtask(activeTimerSubtask, 15 * 60)}
                className="px-4 py-2 bg-gray-100 text-slate-700 text-sm font-semibold rounded hover:bg-gray-200 transition"
              >
                15分にリセット
              </button>

              <button
                onClick={() => setActiveTimerSubtask(null)}
                className="px-3 py-2 text-xs text-red-600 hover:bg-red-50 rounded transition"
              >
                タイマー終了
              </button>
            </div>
          </div>
        )}

        {/* 課題登録フォーム (白メインUI・透けないボタン) */}
        <form onSubmit={handleSubmit} className="flex gap-2 mb-8">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="大きな課題を入力（例：期末レポート 3,000字）"
            className="flex-1 p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-400 bg-white text-slate-800 placeholder-gray-400 shadow-sm"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading || !title.trim()}
            className="px-6 py-3 bg-white text-slate-800 font-semibold rounded-lg hover:bg-sky-200 disabled:bg-gray-200 disabled:text-gray-400 transition shadow-sm opacity-100"
          >
            {loading ? '追加中...' : '追加'}
          </button>
        </form>

        {/* 課題一覧 */}
        <section>
          <h2 className="text-lg font-semibold mb-4 text-white/90">登録された課題一覧</h2>
          {tasks.length === 0 ? (
            <p className="text-gray-300 text-center py-8 bg-white/10 backdrop-blur-xs rounded-lg">
              課題はまだ登録されていません。
            </p>
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
                        ? 'bg-white/80 border-gray-200'
                        : 'bg-white border-gray-200'
                    }`}
                  >
                    {/* 親タスクヘッダー */}
                    <div className="p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3 flex-1 mr-2">
                        <input
                          type="checkbox"
                          checked={task.is_completed}
                          onChange={() => toggleTask(task.id, task.is_completed)}
                          className="w-5 h-5 accent-slate-800 cursor-pointer"
                        />
                        <span
                          className={`font-medium ${
                            task.is_completed
                              ? 'line-through text-gray-400'
                              : 'text-slate-800'
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
                          className="px-3 py-1 text-xs font-semibold rounded-full border border-slate-300 hover:bg-slate-100 text-slate-700 transition flex items-center gap-1 bg-white"
                        >
                          チョップ（15分分解）
                          {totalSubCount > 0 && (
                            <span className="bg-slate-200 px-1.5 py-0.5 rounded-full text-slate-800">
                              {completedSubCount}/{totalSubCount}
                            </span>
                          )}
                        </button>

                        <button
                          onClick={() => deleteTask(task.id)}
                          className="px-2 py-1 text-xs text-red-600 hover:bg-red-50 rounded transition"
                        >
                          削除
                        </button>
                      </div>
                    </div>

                    {/* 階層化表示：サブタスクエリア */}
                    {isExpanded && (
                      <div className="bg-slate-50 border-t border-gray-200 p-4 pl-8 space-y-3">
                        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
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
                            className="flex-1 p-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-slate-500 bg-white text-slate-800 placeholder-gray-400"
                            disabled={subtaskLoading}
                          />
                          <button
                            type="submit"
                            disabled={subtaskLoading || !subtaskTitle.trim()}
                            className="px-4 py-2 bg-slate-800 text-white text-sm font-medium rounded hover:bg-slate-700 disabled:opacity-50 transition"
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
                                className="p-2.5 bg-white border border-gray-200 rounded flex items-center justify-between text-sm"
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
                                      className="flex-1 p-1 border border-gray-300 rounded text-sm focus:outline-none bg-white text-slate-800"
                                    />
                                    <button
                                      onClick={() => handleUpdateSubtask(sub.id)}
                                      className="text-xs text-green-600 hover:underline"
                                    >
                                      保存
                                    </button>
                                    <button
                                      onClick={() => setEditingSubtaskId(null)}
                                      className="text-xs text-gray-500 hover:underline"
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
                                        className="w-4 h-4 accent-slate-800 cursor-pointer"
                                      />
                                      <span
                                        className={
                                          sub.is_completed
                                            ? 'line-through text-gray-400'
                                            : 'text-slate-800'
                                        }
                                      >
                                        {sub.title}
                                      </span>
                                    </div>

                                    <div className="flex items-center gap-2">
                                      {/* タイマー開始ボタン群 */}
                                      {!sub.is_completed && (
                                        <>
                                          <button
                                            onClick={() =>
                                              startTimerForSubtask(sub, 15 * 60)
                                            }
                                            className="px-2 py-1 text-xs bg-slate-800 text-white rounded hover:bg-slate-700 transition"
                                          >
                                            15分タイマー
                                          </button>
                                          <button
                                            onClick={() =>
                                              startTimerForSubtask(sub, 10)
                                            }
                                            className="px-2 py-1 text-xs bg-gray-100 text-slate-600 border border-gray-300 rounded hover:bg-gray-200 transition"
                                            title="動作テスト用の10秒タイマー"
                                          >
                                            10秒テスト
                                          </button>
                                        </>
                                      )}

                                      <button
                                        onClick={() => {
                                          setEditingSubtaskId(sub.id);
                                          setEditingSubtaskTitle(sub.title);
                                        }}
                                        className="text-xs text-gray-500 hover:text-slate-800"
                                      >
                                        編集
                                      </button>
                                      <button
                                        onClick={() => deleteSubtask(sub.id)}
                                        className="text-xs text-red-500 hover:underline"
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
                          <p className="text-xs text-gray-400 italic">
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