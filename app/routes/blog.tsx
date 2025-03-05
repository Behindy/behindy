import { json, LoaderFunctionArgs } from "@remix-run/node";
import { Outlet, useLocation, useSearchParams } from "@remix-run/react";
import { authenticateUser } from "../utils/auth.server";
import MainLayout from "../components/layout/MainLayout";
import PostSortButtons from "../components/PostSortButtons";
import { useBlog } from "../context/BlogContext";

export async function loader({ request }: LoaderFunctionArgs) {
  const user = await authenticateUser(request);
  return json({ user });
}

export default function BlogLayout() {
  const [searchParams] = useSearchParams();
  const { showMainSortUI } = useBlog();
  const location = useLocation();
  
  if (location.pathname === "/blog/search") {
    return <Outlet />;
  }
  
  const hideUIInPaths = ["/blog/about", "/blog/dashboard", "/blog/mypage"];
  const shouldShowSortUI = showMainSortUI && !hideUIInPaths.includes(location.pathname);
  
  return (
    <MainLayout>
      <div className="max-w-5xl mx-auto">
        {shouldShowSortUI && (
          <div className="mb-8 border-b pb-5">
            <div className="flex justify-end items-center gap-2">
              <PostSortButtons baseUrl="/blog" />
            </div>
          </div>
        )}
        
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
        <Outlet />
      </div>
    </MainLayout>
  );
}