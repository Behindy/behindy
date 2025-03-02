import { Link, useLoaderData, Form, useSearchParams, useNavigate  } from "@remix-run/react";
import { useState, useEffect, useRef } from "react";
import { Search } from "lucide-react";
import { useBlog } from "../../context/BlogContext";

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

interface HeaderProps {
  user?: User | null;
}

export default function Header({ user: propUser }: HeaderProps) {
  const navigate = useNavigate();
  
  // props로 전달된 user가 있으면 사용하고, 없으면 loader에서 가져옴
  let userData: User | null = null;
  
  try {
    // useLoaderData는 레이아웃 컴포넌트에서는 사용하되, 
    // 별도 레이아웃에서는 에러가 발생할 수 있으므로 try-catch로 처리
    const loaderData = useLoaderData<LoaderData>();
    userData = propUser || loaderData.user;
  } catch (e) {
    // useLoaderData 사용 중 오류 발생 시 props의 user 사용
    userData = propUser || null;
  }
  
  const [searchParams] = useSearchParams();
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  
  // BlogContext 사용
  const { searchTerm, setSearchTerm } = useBlog();
  
  useEffect(() => {
    if (isSearchOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isSearchOpen]);

  // URL의 검색 쿼리가 변경되면 검색어 상태 업데이트
  useEffect(() => {
    setSearchTerm(searchParams.get("q") || "");
  }, [searchParams, setSearchTerm]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (searchTerm.trim()) {
      // 검색 페이지로 이동
      navigate(`/blog/search?type=keyword&q=${encodeURIComponent(searchTerm.trim())}`);
      setIsSearchOpen(false);
    }
  };
  
  return (
    <header className="bg-white shadow">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link to="/" className="flex-shrink-0 flex items-center">
              <span className="text-xl font-bold text-blue-600">Behindy</span>
            </Link>
            <nav className="ml-10 flex items-center space-x-4">
              <Link to="/blog" className="px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:text-white hover:bg-gray-200 transition">
                블로그
              </Link>
              {userData && (
                <Link to="/blog/dashboard" className="px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:text-white hover:bg-gray-200 transition">
                  대시보드
                </Link>
              )}
                <Link to="/blog/about" className="px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:text-white hover:bg-gray-200 transition">
                  소개
                </Link>
            </nav>
          </div>
          
          <div className="flex items-center space-x-2">
            {/* 검색창 */}
            {isSearchOpen ? (
              <Form onSubmit={handleSearch} className="relative">
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="검색..."
                  className="w-48 sm:w-64 pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                  <Search size={16} className="text-gray-400" />
                </div>
                <button 
                  type="button" 
                  onClick={() => setIsSearchOpen(false)}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  &times;
                </button>
              </Form>
            ) : (
              <button
                onClick={() => setIsSearchOpen(true)}
                className="p-2 text-gray-600 hover:text-blue-600 focus:outline-none"
              >
                <Search size={20} />
              </button>
            )}
            
            {userData ? (
              <div className="flex items-center space-x-4">
                {userData && (
                  <Link to="/compose" className="px-6 py-2 text-sm font-medium rounded-md bg-blue-600 text-white hover:bg-blue-700">
                    새 글 작성
                  </Link>
                )}
                <div className="flex items-center space-x-2">
                  {userData.profileImage ? (
                    <img 
                      src={userData.profileImage} 
                      alt={userData.name}
                      className="w-8 h-8 rounded-full"
                    />
                  ) : (
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-blue-600 font-medium">{userData.name.charAt(0)}</span>
                    </div>
                  )}
                  <span className="text-sm font-medium text-gray-700">{userData.name}</span>
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