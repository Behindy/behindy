import { Link, useLoaderData, Form } from "@remix-run/react";

// 사용자 타입 정의
interface User {
  id: string;
  name: string;
  profileImage?: string | null;
  email?: string;
  role?: string;
}

interface LoaderData {
  user: User | null;
}

export default function Header() {
  // 로더 데이터에서 사용자 정보 가져오기
  const { user } = useLoaderData<LoaderData>();
  
  return (
    <header className="bg-white shadow">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link to="/" className="flex-shrink-0 flex items-center">
              <span className="text-xl font-bold text-blue-600">Behindy</span>
            </Link>
            <nav className="ml-10 flex items-center space-x-4">
              <Link to="/blog" className="px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:text-blue-600">
                블로그
              </Link>
              {user && (
                <Link to="/blog/dashboard" className="px-3 py-2 text-sm font-medium rounded-md bg-gray-100 text-gray-900 hover:bg-gray-200">
                  대시보드
                </Link>
              )}
            </nav>
          </div>
          <div className="flex items-center">
            {user ? (
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  {user.profileImage ? (
                    <img 
                      src={user.profileImage} 
                      alt={user.name}
                      className="w-8 h-8 rounded-full"
                    />
                  ) : (
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-blue-600 font-medium">{user.name.charAt(0)}</span>
                    </div>
                  )}
                  <span className="text-sm font-medium text-gray-700">{user.name}</span>
                </div>
                
                <Form action="/logout" method="post">
                  <button 
                    type="submit"
                    className="px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:text-blue-600"
                  >
                    로그아웃
                  </button>
                </Form>
              </div>
            ) : (
              <>
                <Link to="/login" className="px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:text-blue-600">
                  로그인
                </Link>
                <Link to="/register" className="ml-4 px-3 py-2 rounded-md text-sm font-medium bg-blue-600 text-white hover:bg-blue-700">
                  회원가입
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}