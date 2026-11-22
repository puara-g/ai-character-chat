// 카카오톡 대화 내보내기 파일 분석 (브라우저에서만 실행, 서버로 원본을 보내지 않음)
// 지원 형식: PC(.txt), 안드로이드(.txt), 아이폰(.txt), PC(.csv)

const MAX_STYLE_EXAMPLES = 150;
const MAX_PAIRS = 1000;
const MAX_Q_LEN = 150;
const MAX_A_LEN = 240;

// 사진·이모티콘처럼 글이 아닌 메시지
const NON_TEXT = /^(사진( \d+장)?|동영상|이모티콘|음성메시지|삭제된 메시지입니다\.?|메시지가 삭제되었습니다\.?|파일: .*|샵검색: .*|보이스톡 .*|페이스톡 .*|송금.*|지도: .*|라이브톡.*|\(이모티콘\)|Photo|Video|Emoticon)$/;

const toHour24 = (ampm, h) => {
  let hour = Number(h) % 12;
  if (ampm === '오후' || ampm === 'PM') hour += 12;
  return hour;
};

// 개인정보로 보이는 부분 가리기
export const maskPrivate = (text) =>
  text
    .replace(/https?:\/\/\S+|www\.\S+/gi, '[링크]')
    .replace(/[\w.+-]+@[\w-]+\.[\w.]+/g, '[이메일]')
    .replace(/01[016789][-.\s]?\d{3,4}[-.\s]?\d{4}/g, '[전화번호]')
    .replace(/\d{2,6}-\d{2,6}-\d{2,8}/g, '[번호]')
    .replace(/\d{9,}/g, '[번호]');

const LINE_PATTERNS = [
  // PC: [이름] [오후 3:21] 메시지
  {
    re: /^\[(.+?)\] \[(오전|오후|AM|PM) (\d{1,2}):(\d{2})\] ?(.*)$/,
    pick: (m, date) => ({ name: m[1], text: m[5], ts: stamp(date, toHour24(m[2], m[3]), m[4]) }),
  },
  // 안드로이드/새 아이폰: 2024년 1월 1일 오후 3:21, 이름 : 메시지
  {
    re: /^(\d{4})년 (\d{1,2})월 (\d{1,2})일 (오전|오후) (\d{1,2}):(\d{2}), (.+?) : (.*)$/,
    pick: (m) => ({ name: m[7], text: m[8], ts: stamp([m[1], m[2], m[3]], toHour24(m[4], m[5]), m[6]) }),
  },
  // 아이폰: 2024. 1. 1. 오후 3:21, 이름 : 메시지
  {
    re: /^(\d{4})\. ?(\d{1,2})\. ?(\d{1,2})\.? (오전|오후|AM|PM) (\d{1,2}):(\d{2}), (.+?) : (.*)$/,
    pick: (m) => ({ name: m[7], text: m[8], ts: stamp([m[1], m[2], m[3]], toHour24(m[4], m[5]), m[6]) }),
  },
  // 영문/24시간: 2024-01-01 15:21:00, 이름 : 메시지
  {
    re: /^(\d{4})-(\d{2})-(\d{2}) (\d{1,2}):(\d{2})(?::\d{2})?, (.+?) : (.*)$/,
    pick: (m) => ({ name: m[6], text: m[7], ts: stamp([m[1], m[2], m[3]], Number(m[4]), m[5]) }),
  },
];

// PC 형식의 날짜 구분선: --------------- 2024년 1월 1일 월요일 ---------------
const PC_DATE = /^-+ (\d{4})년 (\d{1,2})월 (\d{1,2})일 .*-+$/;

const stamp = (date, hour, minute) => {
  if (!date) return 0;
  const [y, mo, d] = date.map(Number);
  return new Date(y, mo - 1, d, hour, Number(minute)).getTime();
};

const parseCsv = (text) => {
  // Date,User,Message (PC 내보내기 csv)
  const rows = [];
  const re = /(?:^|\n)(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}),("(?:[^"]|"")*"|[^,\n]*),("(?:[^"]|"")*"|[^\n]*)/g;
  const unq = (s) => (s.startsWith('"') ? s.slice(1, -1).replace(/""/g, '"') : s);
  let m;
  while ((m = re.exec(text))) {
    rows.push({ name: unq(m[2]), text: unq(m[3]), ts: new Date(m[1].replace(' ', 'T')).getTime() });
  }
  return rows;
};

/** 대화 파일 텍스트 → [{ name, text, ts }] */
export const parseKakao = (raw) => {
  const text = raw.replace(/^﻿/, '').replace(/\r\n?/g, '\n');

  if (/^Date,User,Message/m.test(text)) return cleanup(parseCsv(text));

  const messages = [];
  let pcDate = null;
  for (const line of text.split('\n')) {
    const dm = PC_DATE.exec(line);
    if (dm) {
      pcDate = [dm[1], dm[2], dm[3]];
      continue;
    }
    let matched = false;
    for (const p of LINE_PATTERNS) {
      const m = p.re.exec(line);
      if (m) {
        messages.push(p.pick(m, pcDate));
        matched = true;
        break;
      }
    }
    // 여러 줄 메시지는 앞 메시지에 이어 붙임 (날짜 줄·안내 줄은 무시)
    if (!matched && messages.length && line.trim() && !/^\d{4}[년.-]/.test(line) && !/저장한 날짜|님과 카카오톡 대화/.test(line) && !NON_TEXT.test(line.trim())) {
      messages[messages.length - 1].text += '\n' + line;
    }
  }
  return cleanup(messages);
};

const cleanup = (messages) =>
  messages
    .map((m) => ({ ...m, name: m.name.trim(), text: m.text.trim() }))
    .filter((m) => m.name && m.text && !NON_TEXT.test(m.text));

/** 참여자별 메시지 수 (많은 순) */
export const listParticipants = (messages) => {
  const counts = new Map();
  for (const m of messages) counts.set(m.name, (counts.get(m.name) || 0) + 1);
  return [...counts.entries()].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);
};

// 연속으로 보낸 메시지를 한 번의 '차례'로 묶기
const toTurns = (messages) => {
  const turns = [];
  for (const m of messages) {
    const last = turns[turns.length - 1];
    if (last && last.name === m.name) last.texts.push(m.text);
    else turns.push({ name: m.name, texts: [m.text] });
  }
  return turns;
};

const clip = (s, n) => (s.length > n ? s.slice(0, n) + '…' : s);

/** 고른 사람의 말투 예시·특징·'상대 말 → 실제 대답' 쌍 만들기 */
export const buildProfile = (messages, target) => {
  const mine = messages.filter((m) => m.name === target).map((m) => maskPrivate(m.text));

  // 말투 예시: 전체 기간에서 고르게, 중복 없이
  const unique = [...new Set(mine.filter((t) => t.length >= 2 && t.length <= 80))];
  const step = Math.max(1, unique.length / MAX_STYLE_EXAMPLES);
  const styleExamples = [];
  for (let i = 0; i < unique.length && styleExamples.length < MAX_STYLE_EXAMPLES; i += step) {
    styleExamples.push(unique[Math.floor(i)]);
  }

  // 대답 쌍
  const turns = toTurns(messages);
  const pairs = [];
  for (let i = 1; i < turns.length; i++) {
    const a = turns[i];
    const q = turns[i - 1];
    if (a.name !== target || q.name === target) continue;
    const qText = clip(maskPrivate(q.texts.slice(-3).join(' ')), MAX_Q_LEN);
    const aText = clip(maskPrivate(a.texts.slice(0, 4).join('\n')), MAX_A_LEN);
    if (qText.length >= 2 && aText.length >= 1) pairs.push({ q: qText, a: aText });
  }
  const memoryPairs = pairs.slice(-MAX_PAIRS);

  // 말투 특징 요약
  const targetTurns = turns.filter((t) => t.name === target);
  const avgLen = mine.length ? Math.round(mine.reduce((s, t) => s + t.length, 0) / mine.length) : 0;
  const avgBurst = targetTurns.length
    ? targetTurns.reduce((s, t) => s + t.texts.length, 0) / targetTurns.length
    : 1;
  const ratio = (re) => (mine.length ? mine.filter((t) => re.test(t)).length / mine.length : 0);
  const endings = topEndings(mine);

  const traits = [`메시지 하나의 평균 길이는 ${avgLen}자`];
  if (avgBurst >= 1.4) traits.push(`한 번에 평균 ${avgBurst.toFixed(1)}개의 말풍선으로 나눠 보냄`);
  if (ratio(/ㅋㅋ/) > 0.15) traits.push('ㅋㅋ를 자주 씀');
  if (ratio(/ㅎㅎ/) > 0.1) traits.push('ㅎㅎ를 자주 씀');
  if (ratio(/ㅠㅠ|ㅜㅜ/) > 0.08) traits.push('ㅠㅠ/ㅜㅜ를 자주 씀');
  if (ratio(/[.]$/) < 0.1) traits.push('문장 끝에 마침표를 거의 안 찍음');
  if (ratio(/\?/) > 0.2) traits.push('질문을 자주 함');
  if (endings.length) traits.push(`자주 쓰는 말끝: ${endings.join(', ')}`);

  return {
    styleExamples,
    styleSummary: traits.join(' / '),
    memoryPairs,
    multiBubble: avgBurst >= 1.4,
    stats: { messages: mine.length, pairs: memoryPairs.length },
  };
};

const topEndings = (texts) => {
  const counts = new Map();
  for (const t of texts) {
    const clean = t.replace(/[\s.!?~ㅋㅎㅠㅜ^]+$/g, '');
    if (clean.length < 2) continue;
    const end = clean.slice(-2);
    if (/[가-힣]{2}/.test(end)) counts.set(end, (counts.get(end) || 0) + 1);
  }
  return [...counts.entries()]
    .filter(([, c]) => c >= 3)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([e]) => `~${e}`);
};

// ---------- 비슷한 대화 찾기 ----------
const grams = (s) => {
  const t = s.toLowerCase().replace(/[^0-9a-z가-힣ㄱ-ㅎㅏ-ㅣ]/g, '');
  const set = new Set();
  for (const ch of t) set.add('1' + ch);
  for (let i = 0; i < t.length - 1; i++) set.add(t.slice(i, i + 2));
  return set;
};

// ---------- 의미 비교용 벡터 (int8로 줄여서 base64로 저장) ----------
export const encodeVec = (values) => {
  const n = Math.sqrt(values.reduce((s, x) => s + x * x, 0)) || 1;
  const bytes = new Int8Array(values.length);
  values.forEach((x, i) => (bytes[i] = Math.max(-127, Math.min(127, Math.round((x / n) * 127)))));
  let bin = '';
  new Uint8Array(bytes.buffer).forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin);
};

export const decodeVec = (b64) => {
  const bin = atob(b64);
  const bytes = new Int8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = (bin.charCodeAt(i) << 24) >> 24;
  return bytes;
};

const cosine = (a, b) => {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  return dot / (Math.sqrt(na * nb) || 1);
};

// 의미 비교 기준: 같은 뜻 0.92+, 비슷한 상황 0.86+, 관계없음 ~0.78
const SEMANTIC_MIN = 0.86;

/**
 * 지금 메시지와 비슷한 '상대 말'을 찾아 그때의 실제 대답을 돌려줌.
 * queryVec(문장 벡터)이 있으면 의미로, 없으면 글자로 비교.
 */
export const findMemories = (pairs, query, { queryVec, k = 6 } = {}) => {
  if (!Array.isArray(pairs) || !pairs.length) return [];

  // 의미로 찾은 후보 (벡터가 있는 최근 대화) + 글자로 찾은 후보 (전체 대화)
  const semantic = queryVec
    ? pairs
        .filter((p) => p.v)
        .map((p) => ({ q: p.q, a: p.a, score: cosine(Array.from(queryVec), decodeVec(p.v)) }))
        .filter((p) => p.score >= SEMANTIC_MIN)
        .sort((a, b) => b.score - a.score)
        .slice(0, k)
    : [];
  const lexical = findByText(pairs, query, k);

  // 같은 대화는 한 번만, 의미 후보 먼저. 최종 판단은 AI가 함
  const seen = new Set();
  return [...semantic, ...lexical]
    .filter((p) => (seen.has(p.q + p.a) ? false : seen.add(p.q + p.a)))
    .slice(0, k)
    .map((p) => ({ ...p, score: Math.round(p.score * 100) / 100 }));
};

const findByText = (pairs, query, k, minScore = 0.22) => {
  const qb = grams(query);
  if (!qb.size) return [];
  const scored = [];
  for (const p of pairs) {
    const pb = grams(p.q);
    if (!pb.size) continue;
    let inter = 0;
    let pairInter = 0; // 두 글자 묶음이 겹친 수
    for (const g of qb) {
      if (pb.has(g)) {
        inter++;
        if (g[0] !== '1') pairInter++;
      }
    }
    // 둘 다 두 글자 이상인데 두 글자 묶음이 하나도 안 겹치면 우연한 한 글자 일치로 봄
    const tiny = qb.size <= 3; // 내 메시지가 아주 짧을 때(예: "자니?")만 한 글자 일치 허용
    if (!pairInter && !tiny) continue;
    const score = inter / Math.sqrt(qb.size * pb.size);
    if (score >= minScore) scored.push({ q: p.q, a: p.a, score: Math.round(score * 100) / 100 });
  }
  return scored.sort((a, b) => b.score - a.score).slice(0, k);
};
