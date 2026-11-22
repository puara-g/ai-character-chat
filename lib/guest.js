// 로그인하지 않은 사용자(체험 모드)의 캐릭터·대화를 브라우저 탭에만 임시로 보관한다.
// sessionStorage라서 탭을 닫으면 사라진다. 영구 저장은 로그인 후 Supabase에 한다.

const CHARS_KEY = 'guest_characters';
const msgsKey = (id) => `guest_messages_${id}`;

export const isGuestId = (id) => typeof id === 'string' && id.startsWith('guest-');

const read = (key, fallback) => {
  try {
    const raw = sessionStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
};

const write = (key, value) => {
  try {
    sessionStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
};

export const getGuestCharacters = () => read(CHARS_KEY, []);

export const getGuestCharacter = (id) => getGuestCharacters().find((c) => c.id === id) || null;

const memoryKey = (id) => `guest_memory_${id}`;

export const addGuestCharacter = ({ memory_pairs: memoryPairs, ...data }) => {
  const character = {
    ...data,
    id: `guest-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    created_at: new Date().toISOString(),
  };
  const list = [character, ...getGuestCharacters()];
  // 이미지(data URL) 때문에 용량이 넘치면 이미지 없이라도 저장
  if (!write(CHARS_KEY, list)) {
    character.avatar_url = null;
    write(CHARS_KEY, [character, ...getGuestCharacters()]);
  }

  // 카톡 대답 쌍은 목록과 따로 보관 (목록을 가볍게). 넘치면 최근 것만 남김
  if (Array.isArray(memoryPairs) && memoryPairs.length) {
    let pairs = memoryPairs;
    while (pairs.length && !write(memoryKey(character.id), pairs)) {
      pairs = pairs.slice(Math.floor(pairs.length / 2));
    }
  }
  return character;
};

export const getGuestMemory = (id) => read(memoryKey(id), []);

export const removeGuestCharacter = (id) => {
  write(CHARS_KEY, getGuestCharacters().filter((c) => c.id !== id));
  try {
    sessionStorage.removeItem(msgsKey(id));
    sessionStorage.removeItem(memoryKey(id));
  } catch {}
};

export const getGuestMessages = (id) => read(msgsKey(id), []);

export const setGuestMessages = (id, messages) => write(msgsKey(id), messages);
