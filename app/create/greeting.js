// 미리보기 말풍선용 첫인사 만들기.
// 말투 → 인사 첫 문장과 어미, 성격(마지막으로 고른 것) → 두 번째 문장.

// 이름 끝 글자에 받침이 있는지 (이야/야, 이에요/예요 고르기)
export const hasBatchim = (word) => {
  const code = word.charCodeAt(word.length - 1) - 0xac00;
  return code >= 0 && code <= 11171 && code % 28 !== 0;
};

// ban: 반말, jon: 존댓말, sat: 사투리
const PERSONALITY_LINES = {
  다정함: {
    ban: '오늘 하루는 어땠어? 무슨 일 있었으면 다 얘기해 줘.',
    jon: '오늘 하루는 어떠셨어요? 편하게 다 얘기해 주세요.',
    sat: '오늘 하루 우째 보냈노? 다 얘기해 봐라.',
  },
  츤데레: {
    ban: '딱히 너 기다린 건 아니거든? 그냥… 심심했을 뿐이야.',
    jon: '딱히 기다린 건 아니에요. 그냥… 시간이 남았을 뿐이에요.',
    sat: '니 기다린 거 아이거든? 그냥 심심해서 그런 기다.',
  },
  '장난기 많음': {
    ban: '오늘은 무슨 장난 칠까? 히히, 각오해!',
    jon: '오늘은 어떤 장난을 쳐 볼까요? 각오하세요, 히히.',
    sat: '오늘은 뭔 장난 쳐 보꼬? 각오해래이, 히히.',
  },
  시크함: {
    ban: '용건만 말해. 들어는 줄게.',
    jon: '용건만 말씀하세요. 들어는 드릴게요.',
    sat: '용건만 말해라. 들어는 주께.',
  },
  수줍음: {
    ban: '어, 어… 말 걸어줘서 고마워. 나 이런 거 처음이라…',
    jon: '저, 저기… 말 걸어 주셔서 고마워요. 이런 건 처음이라서요…',
    sat: '어, 어… 말 걸어 줘서 고맙데이. 이런 거 처음이라…',
  },
  활발함: {
    ban: '와, 드디어 왔다! 오늘 뭐 하고 놀까?!',
    jon: '와, 드디어 오셨네요! 오늘은 뭐 하고 놀까요?!',
    sat: '와, 드디어 왔네! 오늘 뭐 하고 노꼬?!',
  },
  지적임: {
    ban: '궁금한 게 있으면 뭐든 물어봐. 같이 생각해 보자.',
    jon: '궁금한 게 있으면 무엇이든 물어보세요. 함께 생각해 봐요.',
    sat: '궁금한 거 있으면 뭐든 물어봐라. 같이 생각해 보자.',
  },
  엉뚱함: {
    ban: '근데 구름은 무슨 맛일까? 솜사탕 맛이면 좋겠다!',
    jon: '그런데 구름은 무슨 맛일까요? 솜사탕 맛이면 좋겠어요!',
    sat: '근데 구름은 무슨 맛이겠노? 솜사탕 맛이면 좋겠다!',
  },
};

const DEFAULT_LINE = {
  ban: '우리 얘기 많이 하자!',
  jon: '앞으로 편하게 이야기 나눠요.',
  sat: '마, 얘기나 좀 하자!',
};

// 직접 입력한 말투도 키워드로 대충 분류
const toneStyle = (tone) => {
  if (/사투리|경상|부산|대구|전라|충청|제주/.test(tone)) return 'satoori';
  if (/존댓|존대|높임|요체|정중/.test(tone)) return 'polite';
  if (/귀여|애교|깜찍/.test(tone)) return 'cute';
  if (/무뚝|건조|단답|퉁명/.test(tone)) return 'blunt';
  if (/능글|느끼|플러팅/.test(tone)) return 'sly';
  return 'casual';
};

export const greetingFor = (name, tone, personalityTags) => {
  const n = name.trim() || '캐릭터';
  const b = hasBatchim(n);
  const style = toneStyle(tone);

  // 가장 마지막에 고른(입력한) 성격 중 예시 문장이 있는 것
  const key = [...personalityTags].reverse().find((t) => PERSONALITY_LINES[t]);
  const lines = PERSONALITY_LINES[key] || DEFAULT_LINE;

  switch (style) {
    case 'polite':
      return `안녕하세요, 저는 ${n}${b ? '이에요' : '예요'}. ${lines.jon}`;
    case 'satoori':
      return `왔나? 내는 ${n}${b ? '이다' : '다'}. ${lines.sat}`;
    case 'cute':
      return (
        `안뇽~ 나는 ${n}${b ? '이야' : '야'}! ${lines.ban}`
          .replace(/\?!/g, '?')
          .replace(/(?<!\?)[.!]+(?=\s|$)/g, '~') + ' 💕'
      );
    case 'blunt':
      return `${n}${b ? '이야' : '야'}. ${lines.ban}`
        .replace(/[!]+/g, '.')
        .replace(/\?\./g, '?')
        .replace(/(히히|와),?\s*/g, '');
    case 'sly':
      return `왔어? 나 ${n}${b ? '이야' : '야'}~ ${lines.ban} 후후~`;
    default:
      return `안녕! 나는 ${n}${b ? '이야' : '야'}. ${lines.ban}`;
  }
};
