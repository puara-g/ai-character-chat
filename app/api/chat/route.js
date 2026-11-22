import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(
  process.env.NEXT_PUBLIC_GEMINI_API_KEY || process.env.GEMINI_API_KEY
);

// 대화 저장은 브라우저(로그인한 사용자 권한)에서 하고,
// 이 API는 받은 캐릭터 설정과 최근 대화로 답장만 만든다.
export async function POST(req) {
  try {
    const body = await req.json();
    const { message, character, history: clientHistory, memories } = body;

    if (!message || !character) {
      return Response.json({ error: '필수 데이터가 누락되었습니다.' }, { status: 400 });
    }

    const baseInstruction = `
너는 지금부터 사용자가 설정한 아래 캐릭터로 완벽하게 빙의하여 연기해야 해.

[캐릭터 프로필]
- 이름: ${character.name || 'AI'}
- 성별: ${character.gender || '미정'}
- 나이: ${character.age || '미정'}
- 성격: ${character.personality || (character.source === 'kakao' ? '아래 실제 메시지에서 드러나는 성격' : '다정함')}
- 말투: ${character.tone || (character.source === 'kakao' ? '아래 실제 메시지 말투 그대로' : '친근한 반말')}
${character.detail ? `- 추가 상세설정: ${character.detail}` : ''}

[대화 규칙]
1. 위 프로필에 어긋나지 않는 언어 습관과 어조를 철저히 유지할 것.
2. AI라는 티를 내지 말고, 오직 캐릭터로서 답변할 것.
3. 지금은 메신저로 채팅하는 중이야. 실제 사람이 카톡 보내듯 짧게 1~2문장으로 답해.
4. 한 번에 하나의 말만 해. 감탄사, 상황 설명, 되묻기를 한 답변에 몰아 넣지 말고 문단도 나누지 마.
5. 단, 상대가 "자세히", "길게", "더 얘기해줘", "설명해줘"처럼 길게 말해 달라고 하면 그 답변만큼은 원하는 만큼 충분히 길게 답해. 이때도 캐릭터 말투는 유지해.
6. 길게 답해 달라는 요청이 없으면 다시 짧은 메신저 답장으로 돌아가.
    `.trim();

    const systemInstruction = [baseInstruction, kakaoInstruction(character, memories)].filter(Boolean).join('\n\n');

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
    let botReply = result.response.text();

    // 카톡 캐릭터: 실제로 이모지를 안 쓰던 사람이면 답변에서도 이모지 제거
    const examples = character.style?.examples;
    if (character.source === 'kakao' && Array.isArray(examples) && !examples.some((t) => EMOJI.test(t))) {
      botReply = botReply.replace(EMOJI_ALL, '').replace(/[ \t]{2,}/g, ' ').replace(/ +\n/g, '\n').trim();
    }

    return Response.json({ reply: botReply });
  } catch (error) {
    console.error('Chat API Error:', error);
    const message = isBusyError(error)
      ? '지금 AI 서버에 사용자가 많아요. 잠시 후 다시 보내 주세요.'
      : '대화 처리 중 오류가 발생했어요. 잠시 후 다시 시도해 주세요.';
    return Response.json({ error: message }, { status: isBusyError(error) ? 503 : 500 });
  }
}

const EMOJI = /\p{Extended_Pictographic}/u;
const EMOJI_ALL = /[\p{Extended_Pictographic}\u{FE0F}\u{200D}]/gu;

// 카톡 대화로 만든 캐릭터: 실제 말투 예시 + 비슷한 상황에서 했던 실제 대답
const kakaoInstruction = (character, memories) => {
  const style = character.style;
  if (character.source !== 'kakao' || !style) return '';

  const examples = (Array.isArray(style.examples) ? style.examples : [])
    .slice(0, 150)
    .map((t) => `- ${String(t).replace(/\n/g, ' / ').slice(0, 100)}`)
    .join('\n');

  const recalled = (Array.isArray(memories) ? memories : [])
    .slice(0, 6)
    .map((m) => `상대:${String(m.q).slice(0, 150)}\n${character.name}: ${String(m.a).slice(0, 240)}`)
    .join('\n\n');

  return `
[실제 사람 말투 따라하기]
너는 실제 카카오톡 대화에서 뽑은 "${character.name}"의 말투를 그대로 재현해야 해.
- 아래 실제 메시지들과 똑같은 길이, 말끝, 맞춤법, 띄어쓰기, ㅋㅋ/ㅎㅎ/ㅠㅠ 습관을 따라 해. 표준어로 고치거나 더 예쁘게 다듬지 마.
- 실제 메시지에 없는 말투(과한 친절, 설명조, 이모지)는 쓰지 마.
${style.multiBubble ? '- 이 사람은 말풍선을 여러 개로 나눠 보내는 습관이 있어. 그렇게 보낼 때는 말풍선마다 줄바꿈으로 구분해.' : '- 말풍선 하나로 짧게 보내.'}
${style.summary ? `- 말투 특징: ${style.summary}` : ''}

[${character.name}이(가) 실제로 보낸 메시지 예시]
${examples}
${
  recalled
    ? `
[비슷할 수도 있는 과거 대화 후보 — ${character.name}이(가) 실제로 한 대답]
${recalled}

후보 중 지금 메시지와 정말 같은 상황인 것이 있으면, 그때 한 대답의 표현을 최대한 그대로 살려서 답해. 관계없는 후보는 무시해.
단, 먼저 누가 누구에게 무슨 말을 하는지 확인해. 예를 들어 예전엔 상대가 ${character.name}의 생일을 축하했는데 지금은 상대가 자기 생일이라고 말하는 것처럼 입장이 바뀌었으면, 그 대답을 그대로 쓰지 말고 같은 말투로 지금 상황에 맞게 바꿔 말해. 상황이 다르면 억지로 쓰지 마.`
    : ''
}`.trim();
};

const isBusyError = (err) => {
  const status = err?.status;
  return status === 503 || status === 429 || /\b(503|429)\b|overloaded|high demand/i.test(err?.message || '');
};
