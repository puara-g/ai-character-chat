import { GoogleGenAI } from '@google/genai';
import { supabase } from '@/lib/supabase';

const ai = new GoogleGenAI({ apiKey: process.env.NEXT_PUBLIC_GEMINI_API_KEY });

export async function POST(req) {
  try {
    const body = await req.json();
    const { message, sessionId, character } = body;

    if (!message || !character) {
      return Response.json({ error: '필수 데이터가 누락되었습니다.' }, { status: 400 });
    }

    // 1. 캐릭터 System Instruction 조합
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

    // 2. DB에서 이전 대화 내역 불러오기 (세션 ID가 있을 경우)
    let history = [];
    if (sessionId) {
      const { data: previousMessages } = await supabase
        .from('messages')
        .select('sender, content')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true })
        .limit(10);

      if (previousMessages) {
        history = previousMessages.map((msg) => ({
          role: msg.sender === 'user' ? 'user' : 'model',
          parts: [{ text: msg.content }],
        }));
      }
    }

    // 사용자 메시지를 대화 내역에 추가
    const contents = [...history, { role: 'user', parts: [{ text: message }] }];

    // 3. Gemini API 호출
    const response = await ai.models.generateContent({
      model: 'gemini-1.5-flash',
      config: { systemInstruction },
      contents,
    });

    const botReply = response.text;

    // 4. DB에 유저 메시지와 AI 답변 저장 (세션 ID가 있을 경우)
    if (sessionId) {
      await supabase.from('messages').insert([
        { session_id: sessionId, sender: 'user', content: message },
        { session_id: sessionId, sender: 'bot', content: botReply },
      ]);
    }

    return Response.json({ reply: botReply });
  } catch (error) {
    console.error('Chat API Error:', error);
    return Response.json({ error: error.message || '대화 처리 중 오류가 발생했습니다.' }, { status: 500 });
  }
}