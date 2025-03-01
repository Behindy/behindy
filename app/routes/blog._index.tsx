// blog._index.tsx - 개선된 블로그 게시글 목록
import { json, LoaderFunctionArgs } from "@remix-run/node";
import { Link, useLoaderData, useSearchParams } from "@remix-run/react";
import { db } from "../utils/db.server";
import { formatDate } from "../utils/format";
import { Eye } from "lucide-react";
import { Prisma } from '@prisma/client';

export async function loader({ request }: LoaderFunctionArgs) {
  const searchParams = new URL(request.url).searchParams;
  const page = Number(searchParams.get("page") || "1");
  const limit = 12; // 한 페이지에 표시할 카드 수
  const skip = (page - 1) * limit;
  
  // 검색어 및 정렬 기준 가져오기
  const searchQuery = searchParams.get("q") || "";
  const tagQuery = searchParams.get("tag") || "";
  const sortOrder = searchParams.get("sort") || "latest"; // 기본값은 최신순
  
  // 검색 조건 구성
  let whereCondition: Prisma.PostWhereInput = {
    published: true
  };
  
  // 검색어가 있는 경우 검색 조건 추가
  if (searchQuery) {
    whereCondition = {
      ...whereCondition,
      OR: [
        { title: { contains: searchQuery, mode: 'insensitive' as Prisma.QueryMode } },
        { content: { contains: searchQuery, mode: 'insensitive' as Prisma.QueryMode } },
        { description: { contains: searchQuery, mode: 'insensitive' as Prisma.QueryMode } }
      ]
    };
  }
  
  // 태그 검색이 있는 경우 검색 조건 추가
  if (tagQuery) {
    whereCondition = {
      ...whereCondition,
      tags: {
        some: {
          tag: {
            name: { equals: tagQuery, mode: 'insensitive' as Prisma.QueryMode }
          }
        }
      }
    };
  }
  
  // 정렬 기준 설정
  const orderBy: Prisma.PostOrderByWithRelationInput = sortOrder === "views" 
    ? { views: "desc" } 
    : { createdAt: "desc" };
  
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
        }
      },
    },
  });
  
  // 총 게시글 수 조회
  const count = await db.post.count({
    where: whereCondition,
  });
  
  return json({
    posts,
    pagination: {
      page,
      totalPages: Math.ceil(count / limit),
      totalItems: count,
    },
    query: {
      search: searchQuery,
      tag: tagQuery,
      sort: sortOrder
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

// 로더 데이터 타입 정의

export default function BlogIndex() {
  const { posts, pagination, query } = useLoaderData<typeof loader>();
  const [searchParams] = useSearchParams();
  
  return (
    <div>
      {/* 검색 결과가 없을 때 */}
      {posts.length === 0 && (query.search || query.tag) && (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <h2 className="text-xl font-medium text-gray-700">검색 결과가 없습니다</h2>
          <p className="mt-1 text-gray-500">
            {query.search ? `${query.search}에 대한 ` : ''}
            {query.tag ? `${query.tag}에 대한 ` : ''}
            검색 결과가 없습니다.
          </p>
          <Link 
            to="/blog" 
            className="mt-4 inline-block px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            모든 게시글 보기
          </Link>
        </div>
      )}
      
      {/* 게시글이 없을 때 (검색이 아닌 경우) */}
      {posts.length === 0 && !query.search && !query.tag && (
        <div className="text-center py-12">
          <h2 className="text-xl font-medium text-gray-900">아직 작성된 글이 없습니다</h2>
          <p className="mt-1 text-gray-500">새로운 글을 작성해 보세요!</p>
          <Link 
            to="/compose" 
            className="mt-4 inline-block px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            새 글 작성하기
          </Link>
        </div>
      )}
      
      {/* 게시글 목록 */}
      {posts.length > 0 && (
        <>
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
                            <span
                              key={tagRelation.tag.id}
                              className="px-2 py-1 text-xs bg-gray-100 text-gray-800 rounded-md"
                            >
                              {tagRelation.tag.name}
                            </span>
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
                    <div className="mt-4">
                      <div className="flex items-center text-sm text-gray-500">
                        <div className="flex items-center mr-3 min-w-0 max-w-[50%]">
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
                        </div>
                        
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
        </>
      )}
    </div>
  );
}