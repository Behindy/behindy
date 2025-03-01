import { createContext, useContext, useState, ReactNode, useEffect } from "react";
import { useSearchParams, useLocation } from "@remix-run/react";

interface BlogContextType {
  // 정렬 관련
  sortOrder: string;
  setSortOrder: (order: string) => void;
  
  // UI 표시 제어
  showMainSortUI: boolean;
  setShowMainSortUI: (show: boolean) => void;
  
  // 검색 관련
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  
  // URL 파라미터 생성 헬퍼
  getSortedUrl: (baseUrl: string, sort: string) => string;
}

const BlogContext = createContext<BlogContextType | undefined>(undefined);

export function BlogProvider({ children }: { children: ReactNode }) {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  
  // 정렬 상태
  const [sortOrder, setSortOrder] = useState(searchParams.get("sort") || "latest");
  
  // 메인 정렬 UI 표시 여부
  const [showMainSortUI, setShowMainSortUI] = useState(true);
  
  // 검색어
  const [searchTerm, setSearchTerm] = useState(searchParams.get("q") || "");
  
  // URL 파라미터 변경시 상태 동기화
  useEffect(() => {
    setSortOrder(searchParams.get("sort") || "latest");
    setSearchTerm(searchParams.get("q") || "");
    
    // 작성자 페이지일 경우 메인 정렬 UI 숨김
    const isAuthorPage = location.pathname.startsWith('/blog/author/');
    setShowMainSortUI(!isAuthorPage);
  }, [searchParams, location.pathname]);
  
  // 정렬된 URL 생성 헬퍼 함수
  const getSortedUrl = (baseUrl: string, sort: string) => {
    const params = new URLSearchParams(searchParams);
    params.set("sort", sort);
    return `${baseUrl}?${params.toString()}`;
  };
  
  const value = {
    sortOrder,
    setSortOrder,
    showMainSortUI,
    setShowMainSortUI,
    searchTerm,
    setSearchTerm,
    getSortedUrl
  };
  
  return <BlogContext.Provider value={value}>{children}</BlogContext.Provider>;
}

// 커스텀 훅으로 컨텍스트 사용
export function useBlog() {
  const context = useContext(BlogContext);
  if (context === undefined) {
    throw new Error("useBlog must be used within a BlogProvider");
  }
  return context;
}