// 작품 속 가상 캐릭터 프로필 자동 채우기.
// Google 검색 연동을 먼저 시도하고, 안 되면(무료 등급 등) AI가 아는 지식으로 채움.
// 실존 인물은 만들지 않음 (퍼블리시티권·허위사실 문제).

const MODEL = 'gemini-3.5-flash-lite';
const API = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;
const apiKey = () => process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY;

const FIELDS = ['name', 'work', 'gender', 'age', 'personality', 'tone', 'detail'];

const SCHEMA = {
  type: 'OBJECT',
  properties: {
    found: { type: 'BOOLEAN' },
    isRealPerson: { type: 'BOOLEAN' },
    name: { type: 'STRING' },
    work: { type: 'STRING' },
    gender: { type: 'STRING', enum: ['여성', '남성', '기타'] },
    age: { type: 'STRING' },
    personality: { type: 'STRING' },
    tone: { type: 'STRING' },
    detail: { type: 'STRING' },
  },
  required: ['found', 'isRealPerson', ...FIELDS],
};

const prompt = (query) => `사용자가 AI 채팅 캐릭터로 만들고 싶은 대상: "${query}"
이게 애니·만화·웹툰·드라마·영화·게임·소설 같은 작품 속 가상 캐릭터면, 확실한 정보로 프로필을 채워.
- 실존 인물(연예인, 아이돌, 배우, 가수, 유튜버, 스트리머, 버튜버, 정치인, 운동선수, 역사 인물, 일반인 등)이거나 실존 인물을 그대로 옮긴 캐릭터면 isRealPerson=true, 나머지 칸은 빈 문자열.
- 모르는 캐릭터거나 확실하지 않으면 지어내지 말고 found=false.
- name: 캐릭터 이름. work: 작품명.
- personality: 성격 키워드 3~5개를 쉼표로.
- tone: 말투를 한 줄로. 반말/존댓말 여부와 입버릇을 정확히.
- detail: 작품 속 배경·관계·좋아하는 것을 300자 이내로, 큰 스포일러는 빼고.
- age: 작품 기준 나이를 숫자만 (모르면 빈 문자열). gender: 여성/남성/기타 중 하나.`;

const callGemini = async (body) => {
  const res = await fetch(API, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-goog-api-key': apiKey() },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, text: data.candidates?.[0]?.content?.parts?.map((p) => p.text || '').join('') || '' };
};

const parseJson = (text) => {
  const m = text.match(/\{[\s\S]*\}/);
  if (!m) return null;
  try {
    return JSON.parse(m[0]);
  } catch {
    return null;
  }
};

export async function POST(req) {
  try {
    const { query } = await req.json();
    const q = String(query || '').trim().slice(0, 60);
    if (q.length < 2) return Response.json({ error: '캐릭터 이름을 2글자 이상 적어 주세요.' }, { status: 400 });

    let result = null;
    let grounded = false;

    // 1) 검색 연동 (검색 도구와 JSON 스키마는 같이 못 써서 글에서 JSON을 꺼냄)
    const searched = await callGemini({
      contents: [{ role: 'user', parts: [{ text: `${prompt(q)}\n\n검색해서 확인한 뒤 아래 형식의 JSON만 출력해.\n${JSON.stringify({ found: true, isRealPerson: false, name: '', work: '', gender: '여성', age: '', personality: '', tone: '', detail: '' })}` }] }],
      tools: [{ googleSearch: {} }],
    });
    if (searched.ok) {
      result = parseJson(searched.text);
      grounded = Boolean(result);
    }

    // 2) 검색이 안 되면 AI 지식으로
    if (!result) {
      const known = await callGemini({
        contents: [{ role: 'user', parts: [{ text: prompt(q) }] }],
        generationConfig: { responseMimeType: 'application/json', responseSchema: SCHEMA },
      });
      if (!known.ok) {
        const busy = known.status === 429 || known.status === 503;
        return Response.json(
          { error: busy ? '지금 AI 서버에 사용자가 많아요. 잠시 후 다시 시도해 주세요.' : '캐릭터 정보를 불러오지 못했어요.' },
          { status: busy ? 503 : 502 }
        );
      }
      result = parseJson(known.text);
    }

    if (!result) return Response.json({ error: '캐릭터 정보를 불러오지 못했어요.' }, { status: 502 });

    if (result.isRealPerson) {
      return Response.json(
        { error: '실존 인물은 캐릭터로 만들 수 없어요. 작품 속 가상 캐릭터 이름을 적어 주세요.', reason: 'real_person' },
        { status: 422 }
      );
    }
    if (!result.found || !result.name) {
      return Response.json(
        { error: '캐릭터를 찾지 못했어요. 작품 이름을 같이 적어 보세요. (예: 원피스 루피)', reason: 'not_found' },
        { status: 404 }
      );
    }

    const profile = Object.fromEntries(FIELDS.map((k) => [k, String(result[k] ?? '').trim()]));
    profile.age = profile.age.replace(/[^0-9]/g, '').slice(0, 3);
    if (!['여성', '남성', '기타'].includes(profile.gender)) profile.gender = '기타';
    profile.detail = profile.detail.slice(0, 500);

    return Response.json({ profile, grounded });
  } catch (error) {
    console.error('Autofill API Error:', error);
    return Response.json({ error: '캐릭터 정보를 불러오지 못했어요.' }, { status: 500 });
  }
}
