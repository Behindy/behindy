import { json, LoaderFunctionArgs } from "@remix-run/node";
import { Outlet, useSearchParams } from "@remix-run/react";
import { authenticateUser } from "../utils/auth.server";
import MainLayout from "../components/layout/MainLayout";
import PostSortButtons from "../components/PostSortButtons";
import { useBlog } from "../context/BlogContext";

export async function loader({ request }: LoaderFunctionArgs) {
  const user = await authenticateUser(request);
  return json({ user });
}

// 블로그 레이아웃 컴포넌트
export default function BlogLayout() {
  const [searchParams] = useSearchParams();
  const { showMainSortUI } = useBlog();
  
  return (
    <MainLayout>
      <div className="max-w-5xl mx-auto">
        {/* 메인 정렬 UI - 컨텍스트에 따라 표시 여부 결정 */}
        {showMainSortUI && (
          <div className="mb-8 border-b pb-5">
            <div className="flex justify-end items-center gap-2">
              <PostSortButtons baseUrl="/blog" />
            </div>
          </div>
        )}
        
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