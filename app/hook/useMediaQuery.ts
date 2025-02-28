import { useState, useEffect } from "react";

/**
 * 미디어 쿼리를 확인하는 커스텀 훅
 * @param query 미디어 쿼리 문자열 (예: "(min-width: 1024px)")
 * @returns 미디어 쿼리 일치 여부 (boolean)
 */
export function useMediaQuery(query: string): boolean {
  // 초기값은 false로 설정 (SSR 지원)
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    // window 객체가 존재하는지 확인 (SSR 환경에서는 window가 없을 수 있음)
    if (typeof window !== "undefined") {
      const media = window.matchMedia(query);
      
      // 현재 일치 여부 설정
      setMatches(media.matches);

      // 리스너 함수 정의
      const listener = (event: MediaQueryListEvent) => {
        setMatches(event.matches);
      };

      // 리스너 등록
      media.addEventListener("change", listener);

      // 클린업 함수에서 리스너 제거
      return () => {
        media.removeEventListener("change", listener);
      };
    }
  }, [query]); // 쿼리가 바뀔 때만 이펙트 재실행

  return matches;
}