import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
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
- 余計な解説や挨拶、マークダウン表記は一切含めず、純粋なJSON文字列配列（例: ["アクション1", "アクション2", "アクション3"]）のみを出力してください。
- 各サブタスクは「〜をメモ帳に書く」「〜を検索して1ページ読む」など、15分で即着手できるレベルに具体化してください。
`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
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
      return NextResponse.json({ error: 'LLM API呼び出しに失敗しました' }, { status: 500 });
    }

    const data = await response.json();
    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    // 返ってきた文字列から余計な囲み（```json ... ```等）を除去してJSONパース
    const jsonText = rawText.replace(/```json|```/g, '').trim();
    const subtaskTitles: string[] = JSON.parse(jsonText);

    return NextResponse.json({ subtasks: subtaskTitles });
  } catch (error: any) {
    console.error('Decompose Error:', error);
    return NextResponse.json(
      { error: 'サブタスク分解の処理中にエラーが発生しました' },
      { status: 500 }
    );
  }
}