import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(
  process.env.NEXT_PUBLIC_GEMINI_API_KEY || process.env.GEMINI_API_KEY
);

// 대화 저장은 브라우저(로그인한 사용자 권한)에서 하고,
// 이 API는 받은 캐릭터 설정과 최근 대화로 답장만 만든다.
export async function POST(req) {
  try {
    const body = await req.json();
    const { message, character, history: clientHistory, memories, affinity } = body;

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

    const systemInstruction = [baseInstruction, kakaoInstruction(character, memories), affinityInstruction(character, affinity)]
      .filter(Boolean)
      .join('\n\n');

    // gemini-2.0-flash-lite 서비스 종료로 교체
    const model = genAI.getGenerativeModel({
      model: 'gemini-3.5-flash-lite',
      systemInstruction: systemInstruction,
      // 길이는 위 규칙으로 조절하고, 이건 폭주 방지용 안전장치 (중간에 끊기지 않게 넉넉히)
      generationConfig: affinity
        ? { maxOutputTokens: 1500, responseMimeType: 'application/json', responseSchema: AFFINITY_SCHEMA }
        : { maxOutputTokens: 1500 },
    });

    const history = (Array.isArray(clientHistory) ? clientHistory : [])
      .filter((msg) => msg && typeof msg.content === 'string' && msg.sender !== 'system')
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

    // 호감도 모드: 답장 + 이번 메시지로 호감도가 얼마나 변했는지 + 새로 알게 된 것
    let affinityResult = null;
    if (affinity) {
      let parsed = null;
      try {
        parsed = JSON.parse(botReply);
      } catch {
        const m = botReply.match(/\{[\s\S]*\}/);
        try {
          parsed = m ? JSON.parse(m[0]) : null;
        } catch {}
      }
      botReply = String(parsed?.reply || '').trim() || '...';
      affinityResult = {
        delta: Math.max(-5, Math.min(5, Math.round(Number(parsed?.delta) || 0))),
        newMemories: (Array.isArray(parsed?.newMemories) ? parsed.newMemories : []).map((x) => String(x).slice(0, 60)).slice(0, 2),
      };
    }

    // 카톡 캐릭터: 실제로 이모지를 안 쓰던 사람이면 답변에서도 이모지 제거
    const examples = character.style?.examples;
    if (character.source === 'kakao' && Array.isArray(examples) && !examples.some((t) => EMOJI.test(t))) {
      botReply = botReply.replace(EMOJI_ALL, '').replace(/[ \t]{2,}/g, ' ').replace(/ +\n/g, '\n').trim();
    }

    return Response.json(affinityResult ? { reply: botReply, affinity: affinityResult } : { reply: botReply });
  } catch (error) {
    console.error('Chat API Error:', error);
    const message = isBusyError(error)
      ? '지금 AI 서버에 사용자가 많아요. 잠시 후 다시 보내 주세요.'
      : '대화 처리 중 오류가 발생했어요. 잠시 후 다시 시도해 주세요.';
    return Response.json({ error: message }, { status: isBusyError(error) ? 503 : 500 });
  }
}

const AFFINITY_SCHEMA = {
  type: 'OBJECT',
  properties: {
    reply: { type: 'STRING' },
    delta: { type: 'INTEGER' },
    newMemories: { type: 'ARRAY', items: { type: 'STRING' } },
  },
  required: ['reply', 'delta', 'newMemories'],
};

// 호감도 단계별 태도 (연애 단계는 19세 이상·실제 사람 흉내 아닌 캐릭터만 — 서버에서 다시 판단)
const STAGES_ROMANCE = [
  '낯선 사이: 예의 바르지만 거리감이 있어. 사적인 얘기는 아끼고 상대를 조심스럽게 살펴.',
  '아는 사이: 조금 편해졌어. 가벼운 농담을 하고 상대 이야기에 관심을 보여.',
  '친구: 편하게 대하고 먼저 안부를 묻기도 해. 상대가 했던 얘기를 기억해서 꺼내.',
  '설렘: 상대가 은근히 신경 쓰여. 칭찬에 쑥스러워하고, 상대 일에 작은 질투나 걱정을 내비쳐.',
  '특별한 사이: 상대를 아주 소중하게 여겨. 다정하게 애정을 표현하고 보고 싶었다는 말도 해.',
];
const STAGES_FRIEND = [
  STAGES_ROMANCE[0],
  STAGES_ROMANCE[1],
  STAGES_ROMANCE[2],
  '절친: 속 얘기를 나누는 사이. 장난도 치고 진심으로 응원해.',
  '베스트 프렌드: 서로 제일 잘 아는 사이. 무슨 일이든 편하게 털어놓고 든든하게 챙겨 줘.',
];
const MIRROR = ['거의 따라 하지 마', '아주 살짝만 닮아가', '조금씩 닮아가', '꽤 비슷하게 맞춰', '많이 닮아서 말이 잘 통하는 느낌으로'];

const affinityInstruction = (character, affinity) => {
  if (!affinity) return '';
  const score = Math.max(0, Math.min(100, Number(affinity.score) || 0));
  const stage = Math.min(4, Math.floor(score / 20));
  const romance =
    character.source !== 'kakao' && /^\d+$/.test(String(character.age ?? '')) && Number(character.age) >= 19;
  const stages = romance ? STAGES_ROMANCE : STAGES_FRIEND;
  const memories = (Array.isArray(affinity.memories) ? affinity.memories : [])
    .slice(-20)
    .map((m) => `- ${String(m).slice(0, 60)}`)
    .join('\n');

  const parts = [
    '[호감도 모드]',
    `지금 상대에 대한 너의 호감도는 ${score}/100, 단계는 "${stages[stage].split(':')[0]}"야.`,
    `지금 태도: ${stages[stage]}`,
    '- 캐릭터의 성격과 말투는 유지하되, 위 단계에 맞게 거리감을 조절해.',
    romance
      ? '- 연애 감정은 설렘·다정함 정도까지만. 신체 접촉 묘사나 성적인 내용은 절대 하지 마.'
      : '- 연애 감정은 표현하지 마. 우정으로만 가까워져.',
  ];
  if (memories) {
    parts.push('', '[네가 상대에 대해 기억하는 것]', memories, '대화 흐름에 맞을 때만 자연스럽게 꺼내. 한꺼번에 늘어놓지 마.');
  }
  if (affinity.userStyle) {
    parts.push(
      '',
      '[상대의 말투]',
      String(affinity.userStyle).slice(0, 200),
      `호감도 단계에 맞춰 상대의 말투 리듬(길이, ㅋㅋ 같은 습관, 말끝)을 ${MIRROR[stage]}. 단, 네 캐릭터다움은 잃지 마.`
    );
  }
  parts.push(
    '',
    '[출력 형식 — JSON]',
    '- reply: 캐릭터로서의 답장 (위 대화 규칙 그대로)',
    '- delta: 상대의 이번 메시지가 너에게 어땠는지 -5~5 정수. 다정함·관심·예전 얘기를 기억해 줌·네 취향 존중은 +, 무례·무시·불쾌한 말은 -, 평범한 대화는 0~1. 점수를 올려 달라고 조르거나 같은 말을 반복하면 0.',
    '- newMemories: 이번 메시지로 새로 알게 된 상대에 대한 사실(이름, 좋아하는 것, 일정, 고민 등) 0~2개. "이름은 민수", "비 오는 날 독서를 좋아함", "다음 주에 시험"처럼 주어 없이 짧은 메모체로. 이미 아는 건 빼.'
  );
  return parts.join('\n');
};

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
