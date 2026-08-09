import { GoogleGenerativeAI } from '@google/generative-ai';
import { supabase } from '@/lib/supabase';

const genAI = new GoogleGenerativeAI(
  process.env.NEXT_PUBLIC_GEMINI_API_KEY || process.env.GEMINI_API_KEY
);

export async function POST(req) {
  try {
    const body = await req.json();
    const { message, sessionId, character } = body;

    if (!message || !character) {
      return Response.json({ error: '필수 데이터가 누락되었습니다.' }, { status: 400 });
    }

    const systemInstruction = `
너는 지금부터 사용자가 설정한 아래 캐릭터로 완벽하게 빙의하여 연기해야 해.

[캐릭터 프로필]
- 이름: ${character.name || 'AI'}
- 성별: ${character.gender || '미정'}
- 나이: ${character.age || '미정'}
- 성격: ${character.personality || '다정함'}
- 말투: ${character.tone || '친근한 반말'}
${character.detail ? `- 추가 상세설정: ${character.detail}` : ''}

[대화 규칙]
1. 위 프로필에 어긋나지 않는 언어 습관과 어조를 철저히 유지할 것.
2. AI라는 티를 내지 말고, 오직 캐릭터로서 답변할 것.
    `.trim();

    // 💡 목록에 있는 합법적인(?) 최신 호환 모델로 드디어 교체!
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash-lite',
      systemInstruction: systemInstruction,
    });

    let history = [];
    if (sessionId) {
      const { data: previousMessages } = await supabase
        .from('messages')
        .select('sender, content')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true })
        .limit(10);

      if (previousMessages && previousMessages.length > 0) {
        history = previousMessages.map((msg) => ({
          role: msg.sender === 'user' ? 'user' : 'model',
          parts: [{ text: msg.content }],
        }));
      }
    }

    const chat = model.startChat({ history });
    const result = await chat.sendMessage(message);
    const botReply = result.response.text();

    if (sessionId && botReply) {
      try {
        await supabase.from('messages').insert([
          { session_id: sessionId, sender: 'user', content: message },
          { session_id: sessionId, sender: 'bot', content: botReply },
        ]);
      } catch (dbErr) {
        console.error('DB 저장 오류 (무시 가능):', dbErr);
      }
    }

    return Response.json({ reply: botReply });
  } catch (error) {
    console.error('Chat API Error:', error);
    return Response.json({ error: error.message || '대화 처리 중 오류가 발생했습니다.' }, { status: 500 });
  }
}