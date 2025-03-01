import { json, LoaderFunctionArgs } from "@remix-run/node";
import { Link, useLoaderData, useSearchParams } from "@remix-run/react";
import { db } from "../utils/db.server";
import { formatDate } from "../utils/format";
import { Eye, Tag, Search } from "lucide-react";
import { Prisma } from "@prisma/client";
import Header from "../components/layout/Header";

// 통합 검색 페이지 로더
export async function loader({ request }: LoaderFunctionArgs) {
  const searchParams = new URL(request.url).searchParams;
  const page = Number(searchParams.get("page") || "1");
  const limit = 12; // 카드형 UI에 맞게 한 페이지에 표시할 수 변경
  const skip = (page - 1) * limit;
  
  // 검색 타입과 쿼리 가져오기
  const searchType = searchParams.get("type") || "keyword"; // keyword 또는 tag
  const query = searchParams.get("q") || "";
  const sortOrder = searchParams.get("sort") || "latest";
  
  // 정렬 기준 설정
  const orderBy = sortOrder === "views" 
    ? { views: "desc" as const } 
    : { createdAt: "desc" as const };
  
  // 검색 조건 구성
  let whereCondition: Prisma.PostWhereInput = { 
    published: true 
  };
  
  // 검색 유형에 따른 조건 추가
  if (searchType === "tag" && query) {
    // 태그 검색
    whereCondition = {
      ...whereCondition,
      tags: {
        some: {
          tag: {
            name: { equals: query }
          }
        }
      }
    };
  } else if (searchType === "keyword" && query) {
    // 키워드 검색
    whereCondition = {
      ...whereCondition,
      OR: [
        { title: { contains: query, mode: 'insensitive' } },
        { content: { contains: query, mode: 'insensitive' } },
        { description: { contains: query, mode: 'insensitive' } }
      ]
    };
  }
  
  // 태그 정보 가져오기
  let tag = null;
  if (searchType === "tag" && query) {
    tag = await db.tag.findUnique({
      where: { name: query },
    });
  }
  
  // 게시글 조회
  const posts = await db.post.findMany({
    where: whereCondition,
    orderBy,
    skip,
    take: limit,
    select: {
      id: true,
      title: true,
      slug: true,
      description: true,
      content: true,
      createdAt: true,
      views: true,
      author: {
        select: {
          id: true,
          name: true,
          profileImage: true,
        },
      },
      tags: {
        select: {
          tag: {
            select: {
              id: true,
              name: true,
            }
          }
        },
      },
    },
  });
  
  // 총 게시글 수 조회
  const count = await db.post.count({
    where: whereCondition,
  });
  
  return json({
    posts,
    tag,
    searchType,
    query,
    sortOrder,
    pagination: {
      page,
      totalPages: Math.ceil(count / limit),
      totalItems: count,
    }
  });
}

// 마크다운 내용에서 첫 번째 이미지 URL을 추출하는 함수
function extractFirstImageUrl(content: string): string | null {
  const imgRegex = /!\[.*?\]\((.*?)\)/;
  const match = content.match(imgRegex);
  
  if (match && match[1]) {
    return match[1];
  }
  
  // HTML 이미지 태그도 확인
  const htmlImgRegex = /<img.*?src=["'](.*?)["']/;
  const htmlMatch = content.match(htmlImgRegex);
  
  if (htmlMatch && htmlMatch[1]) {
    return htmlMatch[1];
  }
  
  return null;
}

// 색상 배열 (이미지가 없을 때 랜덤 배경색으로 사용)
const cardColors = [
  'bg-blue-100',
  'bg-green-100',
  'bg-yellow-100',
  'bg-indigo-100',
  'bg-purple-100',
  'bg-pink-100',
  'bg-red-100',
  'bg-orange-100',
];

// 검색 전용 레이아웃 컴포넌트
function SearchLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {children}
        </div>
      </main>
    </div>
  );
}

export default function SearchResults() {
  const { posts, searchType, query, sortOrder, pagination } = useLoaderData<typeof loader>();
  const [searchParams] = useSearchParams();
  
  return (
    <SearchLayout>
      <div>
        {/* 상단 검색 결과 정보 영역 */}
        <div className="mb-8">
          {searchType === "tag" && query ? (
            <>
              <div className="mb-4 px-4 py-3 bg-blue-50 rounded-lg flex items-center">
                <Tag size={18} className="text-blue-500 mr-2" />
                <span className="text-blue-700">#{query} 태그로 검색한 결과입니다.</span>
              </div>
            </>
          ) : searchType === "keyword" && query ? (
            <>
              <div className="mb-4 px-4 py-3 bg-blue-50 rounded-lg flex items-center">
                <Search size={18} className="text-blue-500 mr-2" />
                <span className="text-blue-700">&quot;{query}&quot; 키워드로 검색한 결과입니다.</span>
              </div>
            </>
          ) : (
            <h2 className="text-2xl font-bold mb-2">모든 포스트</h2>
          )}
          
          <div className="flex justify-between items-center">
            <p className="text-gray-600">
              총 {pagination.totalItems}개의 포스트가 있습니다.
            </p>
            
            {/* 정렬 버튼 */}
            <div className="flex items-center gap-1">
              <Link
                to={`/blog/search?type=${searchType}&q=${encodeURIComponent(query || "")}&sort=latest`}
                className={`px-3 py-2 rounded-md text-sm font-medium ${
                  sortOrder !== "views" 
                    ? "bg-blue-100 text-blue-700"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                최신순
              </Link>
              <Link
                to={`/blog/search?type=${searchType}&q=${encodeURIComponent(query || "")}&sort=views`}
                className={`px-3 py-2 rounded-md text-sm font-medium ${
                  sortOrder === "views" 
                    ? "bg-blue-100 text-blue-700"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                조회수
              </Link>
            </div>
          </div>
        </div>

        {/* 게시글이 없을 때 */}
        {posts.length === 0 && (
          <div className="text-center py-12 bg-gray-50 rounded-lg">
            {searchType === "tag" && query ? (
              <h2 className="text-xl font-medium text-gray-700">이 태그의 포스트가 없습니다</h2>
            ) : (
              <h2 className="text-xl font-medium text-gray-700">검색 결과가 없습니다</h2>
            )}
            <Link 
              to="/blog" 
              className="mt-4 inline-block px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              모든 게시글 보기
            </Link>
          </div>
        )}
        
        {/* 게시글 목록 (카드 형식) */}
        {posts.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {posts.map((post, index) => {
              const imageUrl = extractFirstImageUrl(post.content);
              const randomColorClass = cardColors[index % cardColors.length];
              
              return (
                <Link 
                  to={`/blog/${post.slug}`} 
                  key={post.id}
                  className="flex flex-col overflow-hidden rounded-lg shadow-lg hover:shadow-xl hover:-translate-y-1 transition duration-300 transform"
                >
                  {/* 이미지 영역 */}
                  <div className={`h-48 overflow-hidden ${!imageUrl ? randomColorClass : ''}`}>
                    {imageUrl ? (
                      <img 
                        src={imageUrl} 
                        alt={post.title} 
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <span className="text-4xl font-bold text-gray-600 opacity-30">
                          {post.title.charAt(0)}
                        </span>
                      </div>
                    )}
                  </div>
                  
                  {/* 컨텐츠 영역 */}
                  <div className="flex flex-col flex-grow p-4 bg-white">
                    <div className="flex-grow">
                      <h2 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-2">
                        {post.title}
                      </h2>
                      
                      {post.description && (
                        <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                          {post.description}
                        </p>
                      )}
                      
                      {/* 태그 */}
                      {post.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-3">
                          {post.tags.slice(0, 3).map((tagRelation) => (
                            <Link
                              key={tagRelation.tag.id}
                              to={`/blog/search?type=tag&q=${encodeURIComponent(tagRelation.tag.name)}`}
                              onClick={(e) => e.stopPropagation()}
                              className={`px-2 py-1 text-xs rounded-md ${
                                searchType === "tag" && tagRelation.tag.name === query
                                  ? "bg-blue-100 text-blue-800"
                                  : "bg-gray-100 text-gray-800 hover:bg-gray-200"
                              }`}
                            >
                              {tagRelation.tag.name}
                            </Link>
                          ))}
                          {post.tags.length > 3 && (
                            <span className="px-2 py-1 text-xs bg-gray-100 text-gray-800 rounded-md">
                              +{post.tags.length - 3}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                    
                    {/* 하단 정보 */}
                    <div className="mt-2">
                      <div className="flex items-center justify-between text-sm text-gray-500">
                        <Link 
                          to={`/blog/author/${post.author.id}`}
                          onClick={(e) => e.stopPropagation()} 
                          className="flex items-center mr-3 min-w-0 max-w-[50%] hover:text-blue-600 transition-colors"
                        >
                          {post.author.profileImage ? (
                            <img 
                              src={post.author.profileImage} 
                              alt={post.author.name}
                              className="w-5 h-5 rounded-full mr-2 flex-shrink-0"
                            />
                          ) : (
                            <div className="w-5 h-5 rounded-full bg-gray-200 flex items-center justify-center mr-2 flex-shrink-0">
                              <span className="text-xs">{post.author.name.charAt(0)}</span>
                            </div>
                          )}
                          <span className="truncate">{post.author.name}</span>
                        </Link>                          
                        <div className="flex items-center justify-end space-x-3 flex-shrink-0 ml-auto">
                          <span className="flex items-center whitespace-nowrap">
                            <Eye size={14} className="mr-1 flex-shrink-0" />
                            {post.views}
                          </span>
                          <span className="whitespace-nowrap">{formatDate(post.createdAt)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        {/* 페이지네이션 */}
        {pagination.totalPages > 1 && (
          <div className="mt-12 flex justify-center">
            <nav className="flex items-center space-x-2" aria-label="Pagination">
              {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map(
                (page) => {
                  // 현재 검색 파라미터 유지하면서 페이지만 변경
                  const newParams = new URLSearchParams(searchParams);
                  newParams.set("page", page.toString());
                  
                  return (
                    <Link
                      key={page}
                      to={`?${newParams.toString()}`}
                      className={`px-3 py-2 rounded-md text-sm font-medium ${
                        page === pagination.page
                          ? "bg-blue-600 text-white"
                          : "bg-gray-100 text-gray-900 hover:bg-gray-200"
                      }`}
                    >
                      {page}
                    </Link>
                  );
                }
              )}
            </nav>
          </div>
        )}
      </div>
    </SearchLayout>
  );
}