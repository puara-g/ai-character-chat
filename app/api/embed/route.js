// 문장 → 의미 벡터 (카톡 캐릭터의 '비슷한 대화 찾기'용)
// 요청 1번에 최대 100문장 (Google 배치 한도). 많으면 브라우저가 나눠서 보냄.

const MODEL = 'gemini-embedding-001';
const DIMS = 256;
const MAX_TEXTS = 100;
const MAX_CHARS = 300;

const apiKey = () => process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY;

export async function POST(req) {
  try {
    const { texts } = await req.json();
    if (!Array.isArray(texts) || !texts.length || texts.length > MAX_TEXTS) {
      return Response.json({ error: `texts는 1~${MAX_TEXTS}개여야 해요.` }, { status: 400 });
    }

    const body = JSON.stringify({
      requests: texts.map((t) => ({
        model: `models/${MODEL}`,
        content: { parts: [{ text: String(t).slice(0, MAX_CHARS) || ' ' }] },
        taskType: 'SEMANTIC_SIMILARITY',
        outputDimensionality: DIMS,
      })),
    });

    // 바쁘면(429/503) 잠깐 쉬었다가 최대 2번 더
    for (let attempt = 0; ; attempt++) {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:batchEmbedContents`,
        { method: 'POST', headers: { 'content-type': 'application/json', 'x-goog-api-key': apiKey() }, body }
      );
      if (res.ok) {
        const data = await res.json();
        return Response.json({ vectors: data.embeddings.map((e) => e.values) });
      }
      if (attempt >= 2 || (res.status !== 429 && res.status !== 503)) {
        console.error('Embed API Error:', res.status, await res.text());
        return Response.json({ error: '문장 분석에 실패했어요.' }, { status: res.status === 429 ? 429 : 502 });
      }
      await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
    }
  } catch (error) {
    console.error('Embed API Error:', error);
    return Response.json({ error: '문장 분석에 실패했어요.' }, { status: 500 });
  }
}
