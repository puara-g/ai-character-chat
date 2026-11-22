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

export const addGuestCharacter = (data) => {
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
  return character;
};

export const removeGuestCharacter = (id) => {
  write(CHARS_KEY, getGuestCharacters().filter((c) => c.id !== id));
  try {
    sessionStorage.removeItem(msgsKey(id));
  } catch {}
};

export const getGuestMessages = (id) => read(msgsKey(id), []);

export const setGuestMessages = (id, messages) => write(msgsKey(id), messages);
