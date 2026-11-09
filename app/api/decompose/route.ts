import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: Request) {
  try {
    // --- 認証チェック：ログイン済みユーザーのみ利用可能 ---
    const authHeader = req.headers.get('authorization') || '';
    const token = authHeader.replace(/^Bearer\s+/i, '').trim();

    if (!token) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json(
        { error: 'Supabaseの環境変数が設定されていません' },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: '認証に失敗しました' }, { status: 401 });
    }

    // --- ここから従来の処理 ---
    const { taskTitle } = await req.json();

    if (!taskTitle) {
      return NextResponse.json({ error: '課題タイトルが必要です' }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'APIキーが設定されていません' }, { status: 500 });
    }

    const prompt = `
あなたはタスク分解の専門家です。
以下の「大きな課題」を、15分程度で実行可能な「超具体的で小さく行動できるアクション（サブタスク）」3〜5個に分解してください。

【大きな課題】: ${taskTitle}

【出力条件】:
- 余計な挨拶や解説、マークダウン表記は一切含めず、純粋なJSON文字列配列（例: ["アクション1", "アクション2", "アクション3"]）のみを出力してください。
- 各サブタスクは15分で即着手できるレベルに具体化してください。
`;

    // gemini-flash-latest を指定して常に最新のFlashモデルを利用
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Gemini API Error:', errorData);
      const errorMessage = errorData.error?.message || response.statusText;
      return NextResponse.json(
        { error: `LLM APIエラー: ${errorMessage}` },
        { status: 500 }
      );
    }

    const data = await response.json();
    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    const jsonText = rawText.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(jsonText);

    // 文字列配列であることを確認してから返す
    if (!Array.isArray(parsed) || !parsed.every((s) => typeof s === 'string')) {
      return NextResponse.json(
        { error: 'AIの出力形式が不正でした。もう一度お試しください' },
        { status: 500 }
      );
    }

    return NextResponse.json({ subtasks: parsed as string[] });
  } catch (error: any) {
    console.error('Decompose Error:', error);
    return NextResponse.json(
      { error: 'サブタスク分解の処理中にエラーが発生しました' },
      { status: 500 }
    );
  }
}