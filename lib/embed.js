'use client';

import { encodeVec } from './kakao';

const BATCH = 100;
// 무료 등급 한도(1분에 100문장) 안에서 끝나도록, 만들 때는 최근 대화만 의미 분석
export const EMBED_LIMIT = 90;

/** 문장들 → 벡터(Float 배열) 목록. 실패하면 null */
export const embedTexts = async (texts) => {
  const res = await fetch('/api/embed', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ texts }),
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data.vectors || null;
};

/**
 * 최근 대답 쌍 limit개에 '상대 말'의 벡터를 붙여 줌 (v: base64).
 * 나머지와 실패한 부분은 글자 비교로 찾음.
 */
export const attachVectors = async (pairs, onProgress, limit = EMBED_LIMIT) => {
  const out = pairs.map((p) => ({ ...p }));
  const start = Math.max(0, out.length - limit);
  for (let i = start; i < out.length; i += BATCH) {
    const chunk = out.slice(i, i + BATCH);
    const vectors = await embedTexts(chunk.map((p) => p.q));
    if (!vectors) return { pairs: out, complete: false };
    vectors.forEach((v, j) => (out[i + j].v = encodeVec(v)));
    onProgress?.(Math.min(i + BATCH, out.length) - start, out.length - start);
  }
  return { pairs: out, complete: true };
};
