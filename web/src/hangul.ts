const HANGUL_START = 0xac00;
const HANGUL_END = 0xd7a3;
const MEDIAL_COUNT = 21;
const FINAL_COUNT = 28;

// 호환 자모(ㄱ~ㅎ) → 초성 인덱스 매핑
const COMPAT_INITIAL_MAP: Record<number, number> = {
  0x3131: 0, // ㄱ
  0x3132: 1, // ㄲ
  0x3134: 2, // ㄴ
  0x3135: 3, // ㄷ
  0x3136: 4, // ㄸ
  0x3139: 5, // ㄹ
  0x3141: 6, // ㅁ
  0x3142: 7, // ㅂ
  0x3143: 8, // ㅃ
  0x3145: 9, // ㅅ
  0x3146: 10, // ㅆ
  0x3147: 11, // ㅇ
  0x3148: 12, // ㅈ
  0x3149: 13, // ㅉ
  0x314a: 14, // ㅊ
  0x314b: 15, // ㅋ
  0x314c: 16, // ㅌ
  0x314d: 17, // ㅍ
  0x314e: 18, // ㅎ
};

function isSyllable(code: number): boolean {
  return code >= HANGUL_START && code <= HANGUL_END;
}

function decompose(code: number): {
  initial: number;
  medial: number;
  final: number;
} {
  const offset = code - HANGUL_START;
  return {
    initial: Math.floor(offset / (MEDIAL_COUNT * FINAL_COUNT)),
    medial: Math.floor((offset % (MEDIAL_COUNT * FINAL_COUNT)) / FINAL_COUNT),
    final: offset % FINAL_COUNT,
  };
}

function charMatchesPrefix(
  inputCode: number,
  candidateCode: number,
): boolean {
  if (inputCode === candidateCode) return true;

  // 입력이 자음(ㄱ~ㅎ)이면 초성만 비교
  const initialIdx = COMPAT_INITIAL_MAP[inputCode];
  if (initialIdx !== undefined) {
    if (!isSyllable(candidateCode)) return false;
    return decompose(candidateCode).initial === initialIdx;
  }

  // 둘 다 완성형 음절이어야 비교 가능
  if (!isSyllable(inputCode) || !isSyllable(candidateCode)) return false;

  const inp = decompose(inputCode);
  const cand = decompose(candidateCode);

  if (inp.initial !== cand.initial) return false;
  if (inp.medial !== cand.medial) return false;
  // 종성이 없으면 어떤 종성이든 매치
  if (inp.final === 0) return true;
  return inp.final === cand.final;
}

/**
 * 한글 자모 분해 기반 접두사 매칭.
 * 마지막 글자는 부분 매칭(자모 접두사), 나머지는 정확히 일치해야 함.
 *
 * 예: "ㅅ" → 서울, 성남, 수내 / "서" → 서울, 성남 / "성" → 성남
 */
export function hangulStartsWith(
  candidate: string,
  query: string,
): boolean {
  if (query === "") return true;
  if (query.length > candidate.length) return false;

  for (let i = 0; i < query.length - 1; i++) {
    if (query.charCodeAt(i) !== candidate.charCodeAt(i)) return false;
  }

  const lastIdx = query.length - 1;
  return charMatchesPrefix(
    query.charCodeAt(lastIdx),
    candidate.charCodeAt(lastIdx),
  );
}
