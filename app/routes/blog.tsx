// blog.tsx - 개선된 블로그 레이아웃 파일 (검색창 제거)
import { json, LoaderFunctionArgs } from "@remix-run/node";
import { Outlet, useSearchParams, useSubmit } from "@remix-run/react";
import { authenticateUser } from "../utils/auth.server";
import MainLayout from "../components/layout/MainLayout";

export async function loader({ request }: LoaderFunctionArgs) {
  const user = await authenticateUser(request);
  return json({ user });
}

export default function BlogLayout() {
  const [searchParams] = useSearchParams();
  const submit = useSubmit();

  const setSortOrder = (order: string) => {
    const params = new URLSearchParams(searchParams);
    params.set("sort", order);
    submit(params.toString() ? `?${params.toString()}` : ".", { replace: true });
  };

  return (
    <MainLayout>
      <div className="max-w-5xl mx-auto">
        <div className="mb-8 border-b pb-5">
          {/* 필터링 UI */}
          <div className="flex justify-end items-center gap-2">
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