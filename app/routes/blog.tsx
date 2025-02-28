// blog.tsx - 개선된 블로그 레이아웃 파일
import { json, LoaderFunctionArgs } from "@remix-run/node";
import { Link, Outlet, useLoaderData, Form, useSearchParams, useSubmit } from "@remix-run/react";
import { useEffect, useRef, useState } from "react";
import { authenticateUser } from "../utils/auth.server";
import MainLayout from "../components/layout/MainLayout";
import { Search, Tag } from "lucide-react";

export async function loader({ request }: LoaderFunctionArgs) {
  const user = await authenticateUser(request);
  return json({ user });
}

export default function BlogLayout() {
  const { user } = useLoaderData<typeof loader>();
  const [searchParams] = useSearchParams();
  const [isTagSearch, setIsTagSearch] = useState(false);
  const [searchTerm, setSearchTerm] = useState(searchParams.get("q") || "");
  const [tagTerm, setTagTerm] = useState(searchParams.get("tag") || "");
  const submit = useSubmit();
  const searchInputRef = useRef<HTMLInputElement>(null);
  
  // URL 파라미터가 변경될 때 입력 필드 값도 업데이트
  useEffect(() => {
    setSearchTerm(searchParams.get("q") || "");
    setTagTerm(searchParams.get("tag") || "");
    setIsTagSearch(!!searchParams.get("tag"));
  }, [searchParams]);
  
  // 태그 검색 모드로 전환 시 입력 필드에 포커스
  useEffect(() => {
    if (isTagSearch && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isTagSearch]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    
    const params = new URLSearchParams(searchParams);
    
    if (isTagSearch) {
      // 태그 검색 모드
      if (tagTerm) {
        params.set("tag", tagTerm);
        params.delete("q");
      } else {
        params.delete("tag");
      }
    } else {
      // 일반 검색 모드
      if (searchTerm) {
        params.set("q", searchTerm);
        params.delete("tag");
      } else {
        params.delete("q");
      }
    }
    
    // 검색 시 항상 첫 페이지로 이동
    params.delete("page");
    
    submit(params.toString() ? `?${params.toString()}` : ".", { replace: true });
  };

  const setSortOrder = (order: string) => {
    const params = new URLSearchParams(searchParams);
    params.set("sort", order);
    submit(params.toString() ? `?${params.toString()}` : ".", { replace: true });
  };
  
  const toggleSearchMode = () => {
    setIsTagSearch(!isTagSearch);
    // 모드 전환 시 기존 검색어 초기화
    if (isTagSearch) {
      setTagTerm("");
    } else {
      setSearchTerm("");
    }
  };

  return (
    <MainLayout>
      <div className="max-w-5xl mx-auto">
        <div className="mb-8 border-b pb-5">
          <div className="flex justify-between items-center mb-4">
            
            {user && (
              <Link to="/compose" className="px-3 py-2 text-sm font-medium rounded-md bg-blue-600 text-white hover:bg-blue-700">
                새 글 작성
              </Link>
            )}
          </div>
          
          {/* 검색 및 필터링 UI */}
          <div className="flex flex-wrap items-center gap-2">
            <Form onSubmit={handleSearch} className="flex-1 flex items-center">
              <div className="relative flex-1">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                  {isTagSearch ? <Tag size={16} className="text-gray-400" /> : <Search size={16} className="text-gray-400" />}
                </div>
                <input
                  ref={searchInputRef}
                  type="text"
                  value={isTagSearch ? tagTerm : searchTerm}
                  onChange={(e) => isTagSearch ? setTagTerm(e.target.value) : setSearchTerm(e.target.value)}
                  placeholder={isTagSearch ? "태그로 검색..." : "게시글 검색..."}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <button
                type="button"
                onClick={toggleSearchMode}
                className="ml-2 px-3 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 flex items-center"
              >
                {isTagSearch ? <Search size={16} className="mr-1" /> : <Tag size={16} className="mr-1" />}
                {isTagSearch ? "일반 검색" : "태그 검색"}
              </button>
              <button
                type="submit"
                className="ml-2 px-3 py-2 bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200"
              >
                검색
              </button>
            </Form>
            
            <div className="flex items-center gap-1">
              <button
                onClick={() => setSortOrder("latest")}
                className={`px-3 py-2 rounded-md text-sm font-medium ${
                  searchParams.get("sort") !== "views" 
                    ? "bg-blue-100 text-blue-700"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                최신순
              </button>
              <button
                onClick={() => setSortOrder("views")}
                className={`px-3 py-2 rounded-md text-sm font-medium ${
                  searchParams.get("sort") === "views" 
                    ? "bg-blue-100 text-blue-700"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                조회수
              </button>
            </div>
          </div>
        </div>
        
        {/* 검색 결과 표시 */}
        {(searchParams.get("q") || searchParams.get("tag")) && (
          <div className="mb-4 px-4 py-2 bg-blue-50 text-blue-700 rounded-md">
            {searchParams.get("q") && (
              <p>&quot;{searchParams.get("q")}&quot; 검색 결과</p>
            )}
            {searchParams.get("tag") && (
              <p>태그: &quot;{searchParams.get("tag")}&quot; 검색 결과</p>
            )}
          </div>
        )}
        
        {/* 게시글 목록 (Outlet으로 표시) */}
        <Outlet />
      </div>
    </MainLayout>
  );
}