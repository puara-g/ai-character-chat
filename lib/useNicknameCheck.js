'use client';

import { useEffect, useState } from 'react';
import { checkNickname, isNicknameTaken } from './profiles';

/**
 * 입력하는 동안 닉네임 형식·중복을 바로 확인 (0.4초 쉬면 조회).
 * status: 'empty' | 'checking' | 'invalid' | 'taken' | 'ok' | 'same'
 */
export default function useNicknameCheck(nickname, { myId, current = '' } = {}) {
  const [result, setResult] = useState({ status: 'empty', message: '' });
  const value = nickname.trim();

  useEffect(() => {
    let alive = true;
    const apply = (r) => alive && setResult(r);

    if (!value) {
      apply({ status: 'empty', message: '' });
      return () => {
        alive = false;
      };
    }
    if (current && value === current) {
      apply({ status: 'same', message: '지금 쓰고 있는 닉네임이에요.' });
      return () => {
        alive = false;
      };
    }
    const problem = checkNickname(value);
    if (problem) {
      apply({ status: 'invalid', message: problem });
      return () => {
        alive = false;
      };
    }

    apply({ status: 'checking', message: '확인하는 중...' });
    const timer = setTimeout(async () => {
      const taken = await isNicknameTaken(value, myId);
      apply(taken ? { status: 'taken', message: '이미 쓰고 있는 닉네임이에요.' } : { status: 'ok', message: '사용할 수 있는 닉네임이에요.' });
    }, 400);
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [value, myId, current]);

  return result;
}
