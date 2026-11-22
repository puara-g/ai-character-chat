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
3. 지금은 메신저로 채팅하는 중이야. 실제 사람이 카톡 보내듯 짧게 1~2문장으로 답해.
4. 한 번에 하나의 말만 해. 감탄사, 상황 설명, 되묻기를 한 답변에 몰아 넣지 말고 문단도 나누지 마.
5. 단, 상대가 "자세히", "길게", "더 얘기해줘", "설명해줘"처럼 길게 말해 달라고 하면 그 답변만큼은 원하는 만큼 충분히 길게 답해. 이때도 캐릭터 말투는 유지해.
6. 길게 답해 달라는 요청이 없으면 다시 짧은 메신저 답장으로 돌아가.
    `.trim();

    // gemini-2.0-flash-lite 서비스 종료로 교체
    const model = genAI.getGenerativeModel({
      model: 'gemini-3.5-flash-lite',
      systemInstruction: systemInstruction,
      // 길이는 위 규칙으로 조절하고, 이건 폭주 방지용 안전장치 (중간에 끊기지 않게 넉넉히)
      generationConfig: { maxOutputTokens: 1500 },
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

    // Gemini가 일시적으로 바쁘면(503/429) 잠깐 쉬었다가 최대 2번 더 시도
    let result;
    for (let attempt = 0; ; attempt++) {
      try {
        result = await model.startChat({ history }).sendMessage(message);
        break;
      } catch (err) {
        if (attempt >= 2 || !isBusyError(err)) throw err;
        await new Promise((r) => setTimeout(r, 800 * (attempt + 1)));
      }
    }
    const botReply = result.response.text();

    return Response.json({ reply: botReply });
  } catch (error) {
    console.error('Chat API Error:', error);
    const message = isBusyError(error)
      ? '지금 AI 서버에 사용자가 많아요. 잠시 후 다시 보내 주세요.'
      : '대화 처리 중 오류가 발생했어요. 잠시 후 다시 시도해 주세요.';
    return Response.json({ error: message }, { status: isBusyError(error) ? 503 : 500 });
  }
}

const isBusyError = (err) => {
  const status = err?.status;
  return status === 503 || status === 429 || /\b(503|429)\b|overloaded|high demand/i.test(err?.message || '');
};
