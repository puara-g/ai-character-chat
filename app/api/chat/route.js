import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(
  process.env.NEXT_PUBLIC_GEMINI_API_KEY || process.env.GEMINI_API_KEY
);

// 대화 저장은 브라우저(로그인한 사용자 권한)에서 하고,
// 이 API는 받은 캐릭터 설정과 최근 대화로 답장만 만든다.
export async function POST(req) {
  try {
    const body = await req.json();
    const { message, character, history: clientHistory } = body;

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

    // gemini-2.0-flash-lite 서비스 종료로 교체
    const model = genAI.getGenerativeModel({
      model: 'gemini-3.5-flash-lite',
      systemInstruction: systemInstruction,
    });

    const history = (Array.isArray(clientHistory) ? clientHistory : [])
      .filter((msg) => msg && typeof msg.content === 'string')
      .slice(-10)
      .map((msg) => ({
        role: msg.sender === 'user' ? 'user' : 'model',
        parts: [{ text: msg.content }],
      }));

    // Gemini는 history가 user 메시지로 시작해야 함
    while (history.length && history[0].role !== 'user') history.shift();

    const chat = model.startChat({ history });
    const result = await chat.sendMessage(message);
    const botReply = result.response.text();

    return Response.json({ reply: botReply });
  } catch (error) {
    console.error('Chat API Error:', error);
    return Response.json({ error: error.message || '대화 처리 중 오류가 발생했습니다.' }, { status: 500 });
  }
}
