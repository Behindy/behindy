import { json, LoaderFunctionArgs } from "@remix-run/node";
import { Link, Outlet, useLoaderData, } from "@remix-run/react";
import { authenticateUser } from "../utils/auth.server";
import MainLayout from "../components/layout/MainLayout";

export async function loader({ request }: LoaderFunctionArgs) {
  const user = await authenticateUser(request);
  return json({ user });
}

export default function BlogLayout() {
  const { user } = useLoaderData<typeof loader>();

  return (
    <MainLayout>
      <div className="max-w-5xl mx-auto">
        <div className="mb-8 border-b pb-5">
          <div className="flex justify-between items-center">
            <h1 className="text-3xl font-bold">블로그</h1>
            <div className="flex space-x-2">
              <Link to="/blog" className="px-3 py-2 text-sm font-medium rounded-md bg-gray-100 text-gray-900 hover:bg-gray-200">
                전체 글
              </Link>
              <Link to="/blog/tags" className="px-3 py-2 text-sm font-medium rounded-md bg-gray-100 text-gray-900 hover:bg-gray-200">
                태그
              </Link>
              {user && (
                <Link to="/blog/new" className="px-3 py-2 text-sm font-medium rounded-md bg-blue-600 text-white hover:bg-blue-700">
                  새 글 작성
                </Link>
              )}
              {user && (
                <Link to="/blog/dashboard" className="px-3 py-2 text-sm font-medium rounded-md bg-gray-100 text-gray-900 hover:bg-gray-200">
                  대시보드
                </Link>
              )}
            </div>
          </div>
        </div>
        
        <Outlet />
      </div>
    </MainLayout>
  );
}