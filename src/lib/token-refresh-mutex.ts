/**
 * 토큰 갱신 뮤텍스 모듈
 *
 * **목적**: 여러 API 요청이 동시에 발생할 때 토큰 갱신을 한 번만 수행
 * - 토큰 만료 여부 확인
 * - 갱신 중이면 기존 Promise 대기 (중복 갱신 방지)
 * - /api/auth/session 호출로 토큰 갱신
 */

// 토큰 만료 전 여유 시간 (30초)
const TOKEN_REFRESH_BUFFER_MS = 30 * 1000;

// 토큰 상태 관리 (싱글톤)
interface TokenState {
  accessTokenExpires: number | null;
  isRefreshing: boolean;
  refreshPromise: Promise<boolean> | null;
}

const tokenState: TokenState = {
  accessTokenExpires: null,
  isRefreshing: false,
  refreshPromise: null,
};

/**
 * 토큰 만료 시간 업데이트
 * - Provider 초기화 시 서버에서 받은 만료 시간으로 설정
 * - 세션 갱신 성공 후 새 만료 시간으로 업데이트
 */
export function updateTokenExpiry(expiresAt: number | null): void {
  tokenState.accessTokenExpires = expiresAt;
}

/**
 * 현재 저장된 토큰 만료 시간 조회
 */
export function getTokenExpiry(): number | null {
  return tokenState.accessTokenExpires;
}

/**
 * 토큰이 곧 만료되는지 확인
 * - 만료 시간이 설정되지 않은 경우 true 반환 (안전하게 갱신 시도)
 * - 현재 시간 + 버퍼보다 만료 시간이 이전이면 true
 */
export function isTokenExpiringSoon(): boolean {
  if (tokenState.accessTokenExpires === null) {
    return true; // 만료 시간 모름 → 갱신 시도
  }
  return Date.now() + TOKEN_REFRESH_BUFFER_MS > tokenState.accessTokenExpires;
}

/**
 * 토큰 유효성 확인 및 필요 시 갱신
 *
 * **동작**:
 * 1. 토큰이 아직 유효하면 즉시 true 반환
 * 2. 이미 갱신 중이면 기존 Promise 대기
 * 3. 갱신 시작 → /api/auth/session 호출 → 완료 후 뮤텍스 해제
 *
 * @returns 토큰이 유효하면 true, 갱신 실패 시 false
 */
export async function ensureValidToken(): Promise<boolean> {
  // 1. 토큰이 아직 유효하면 바로 통과
  if (!isTokenExpiringSoon()) {
    return true;
  }

  // 2. 이미 갱신 중이면 기존 Promise 대기
  if (tokenState.isRefreshing && tokenState.refreshPromise) {
    return tokenState.refreshPromise;
  }

  // 3. 갱신 시작 (뮤텍스 획득)
  tokenState.isRefreshing = true;
  tokenState.refreshPromise = refreshToken();

  return tokenState.refreshPromise;
}

/**
 * 토큰 갱신 실행
 * - /api/auth/session 호출로 서버에서 JWT 콜백 실행
 * - 성공 시 새 만료 시간 업데이트
 */
async function refreshToken(): Promise<boolean> {
  try {
    const response = await fetch("/api/auth/session", {
      method: "GET",
      credentials: "include",
    });

    if (!response.ok) {
      return false;
    }

    const data = await response.json();

    // 세션 에러 체크
    if (data.error || !data.user) {
      return false;
    }

    // 새 만료 시간 업데이트 (응답에 포함된 경우)
    if (data.accessTokenExpires) {
      updateTokenExpiry(data.accessTokenExpires);
    }

    return true;
  } catch {
    return false;
  } finally {
    // 뮤텍스 해제
    tokenState.isRefreshing = false;
    tokenState.refreshPromise = null;
  }
}

/**
 * 강제 토큰 갱신
 * - 만료 여부와 관계없이 즉시 갱신 시도
 * - visibility change 시 사용
 */
export async function forceRefreshToken(): Promise<boolean> {
  // 이미 갱신 중이면 기존 Promise 대기
  if (tokenState.isRefreshing && tokenState.refreshPromise) {
    return tokenState.refreshPromise;
  }

  tokenState.isRefreshing = true;
  tokenState.refreshPromise = refreshToken();

  return tokenState.refreshPromise;
}
