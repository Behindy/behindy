import { Link } from "@remix-run/react";

export default function Header() {
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
              <Link to="/chat" className="px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:text-blue-600">
                채팅
              </Link>
              <Link to="/dashboard" className="px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:text-blue-600">
                대시보드
              </Link>
            </nav>
          </div>
          <div className="flex items-center">
            <Link to="/login" className="px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:text-blue-600">
              로그인
            </Link>
            <Link to="/signup" className="ml-4 px-3 py-2 rounded-md text-sm font-medium bg-blue-600 text-white hover:bg-blue-700">
              회원가입
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}