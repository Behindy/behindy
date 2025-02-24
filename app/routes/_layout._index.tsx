import { json, LoaderFunctionArgs } from "@remix-run/node";
import { Link, useLoaderData } from "@remix-run/react";
import { getUser } from "../utils/session.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const user = await getUser(request);
  return json({ user });
}

export default function Index() {
  const { user } = useLoaderData<typeof loader>();

  return (
    <div className="flex flex-col items-center justify-center py-12">
      <h1 className="text-4xl font-bold mb-6 text-center">
        Behindy에 오신 것을 환영합니다
      </h1>
      
      <p className="text-xl text-gray-600 max-w-2xl text-center mb-8">
        블로그와 채팅 기능을 제공하는 웹 애플리케이션입니다.
      </p>
      
      {user ? (
        <div className="flex flex-col items-center">
          <p className="text-lg mb-6">
            <span className="font-semibold">{user.name}</span>님, 다시 만나서 반갑습니다!
          </p>
          
          <div className="flex space-x-4">
            <Link
              to="/blog"
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium"
            >
              블로그 보기
            </Link>
            
            <Link
              to="/chat"
              className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-medium"
            >
              채팅 시작하기
            </Link>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center">
          <p className="text-lg mb-6">
            Behindy의 모든 기능을 이용하시려면 로그인하세요.
          </p>
          
          <div className="flex space-x-4">
            <Link
              to="/login"
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium"
            >
              로그인
            </Link>
            
            <Link
              to="/register"
              className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-3 rounded-lg font-medium"
            >
              회원가입
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}