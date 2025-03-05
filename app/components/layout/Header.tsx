import { Link, useLoaderData, Form, useSearchParams, useNavigate  } from "@remix-run/react";
import { useState, useEffect, useRef } from "react";
import { Search, Menu, X } from "lucide-react";
import { useBlog } from "../../context/BlogContext";
import { useMediaQuery } from "../../hook/useMediaQuery";

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
  const isMobile = useMediaQuery("(max-width: 768px)");
  
  let userData: User | null = null;
  
  try {
    const loaderData = useLoaderData<LoaderData>();
    userData = propUser || loaderData.user;
  } catch (e) {
    userData = propUser || null;
  }
  
  const [searchParams] = useSearchParams();
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
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

  // 모바일 메뉴 클릭시 메뉴를 닫음
  const handleMobileMenuItemClick = () => {
    setIsMobileMenuOpen(false);
  };
  
  return (
    <header className="bg-white shadow">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link to="/" className="flex-shrink-0 flex items-center">
              <span className="text-xl font-bold text-blue-600">Behindy</span>
            </Link>
            
            {/* 데스크탑 내비게이션 메뉴 - 모바일에서는 숨김 */}
            {!isMobile && (
              <nav className="ml-10 flex items-center space-x-4">
                <Link to="/blog" className="px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:text-white hover:bg-gray-200 transition">
                  블로그
                </Link>
                <Link to="/blog/about" className="px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:text-white hover:bg-gray-200 transition">
                  소개
                </Link>
                {userData && (
                  <Link to="/blog/dashboard" className="px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:text-white hover:bg-gray-200 transition">
                    통계
                  </Link>
                )}
              </nav>
            )}
          </div>
          
          <div className="flex items-center space-x-2">
            {/* 모바일 환경에서만 표시되는 메뉴 버튼 */}
            {isMobile && (
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="p-2 ml-2 text-gray-600 hover:text-blue-600 focus:outline-none"
                aria-label="메뉴 열기"
              >
                {isMobileMenuOpen ? (
                  <X size={24} />
                ) : (
                  <Menu size={24} />
                )}
              </button>
            )}

            {/* 검색창 */}
            {!isMobile && (
              <>
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
              </>
            )}
            
            {/* 데스크탑 환경에서만 표시되는 사용자 정보 또는 로그인/회원가입 버튼 */}
            {!isMobile && userData ? (
              <div className="flex items-center space-x-4">
                <Link to="/compose" className="px-6 py-2 text-sm font-medium rounded-md bg-blue-600 text-white hover:bg-blue-700">
                  새 글 작성
                </Link>
                <Link to="/blog/mypage" className="px-2 py-1 flex items-center space-x-2 hover:bg-gray-300 rounded-md">
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
                </Link>
                <Form action="/logout" method="post">
                  <button 
                    type="submit"
                    className="px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:text-red-600"
                  >
                    로그아웃
                  </button>
                </Form>
              </div>
            ) : !isMobile && (
              <>
                <Link to="/login" className="px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:text-blue-600">
                  로그인
                </Link>
                <Link to="/register" className="ml-4 px-3 py-2 rounded-md text-sm font-medium bg-blue-600 text-white hover:bg-blue-700">
                  회원가입
                </Link>
              </>
            )}

            {/* 모바일 환경에서만 표시되는 글 작성 버튼 */}
            {isMobile && userData && (
              <Link to="/compose" className="px-3 py-1 text-sm font-medium rounded-md bg-blue-600 text-white hover:bg-blue-700">
                글 작성
              </Link>
            )}
          </div>
        </div>

        {isMobile && isMobileMenuOpen && (
          <div className="md:hidden bg-white py-2 border-t border-gray-200">
            <div className="px-2 pt-2 pb-3 space-y-1">
              <Link 
                to="/blog" 
                className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:bg-gray-200"
                onClick={handleMobileMenuItemClick}
              >
                블로그
              </Link>
              {userData && (
                <Link 
                  to="/blog/dashboard" 
                  className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:bg-gray-200"
                  onClick={handleMobileMenuItemClick}
                >
                  통계
                </Link>
              )}
              <Link 
                to="/blog/about" 
                className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:bg-gray-200"
                onClick={handleMobileMenuItemClick}
              >
                소개
              </Link>

              {/* 모바일 검색창 */}
              <Form onSubmit={handleSearch} className="mt-3 relative">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="검색..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md"
                />
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                  <Search size={16} className="text-gray-400" />
                </div>
                <button
                  type="submit"
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 text-blue-600"
                >
                  검색
                </button>
              </Form>

              {/* 모바일 사용자 정보 또는 로그인/회원가입 버튼 */}
              {userData ? (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <Link to="/blog/mypage" className="flex items-center px-3 py-2">
                    {userData.profileImage ? (
                      <img 
                        src={userData.profileImage} 
                        alt={userData.name}
                        className="w-8 h-8 rounded-full mr-2"
                      />
                    ) : (
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-2">
                        <span className="text-blue-600 font-medium">{userData.name.charAt(0)}</span>
                      </div>
                    )}
                    <span className="font-medium">{userData.name}</span>
                  </Link>
                  <Form action="/logout" method="post" className="mt-2">
                    <button 
                      type="submit"
                      className="w-full text-left px-3 py-2 rounded-md text-base font-medium text-red-600 hover:bg-gray-200"
                      onClick={handleMobileMenuItemClick}
                    >
                      로그아웃
                    </button>
                  </Form>
                </div>
              ) : (
                <div className="mt-4 pt-4 border-t border-gray-200 flex flex-col space-y-2">
                  <Link 
                    to="/login" 
                    className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:bg-gray-200"
                    onClick={handleMobileMenuItemClick}
                  >
                    로그인
                  </Link>
                  <Link 
                    to="/register" 
                    className="block px-3 py-2 rounded-md text-base font-medium text-blue-600 hover:bg-gray-200"
                    onClick={handleMobileMenuItemClick}
                  >
                    회원가입
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  );
}