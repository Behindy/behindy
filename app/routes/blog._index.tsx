import { json, LoaderFunctionArgs } from "@remix-run/node";
import { Link, useLoaderData } from "@remix-run/react";
import { db } from "../utils/db.server";
import { formatDate } from "../utils/format";
import { Eye } from "lucide-react";

export async function loader({ request }: LoaderFunctionArgs) {
  const searchParams = new URL(request.url).searchParams;
  const page = Number(searchParams.get("page") || "1");
  const limit = 8; // 한 페이지에 표시할 카드 수 (2x4 그리드)
  const skip = (page - 1) * limit;

  const posts = await db.post.findMany({
    where: { published: true },
    orderBy: { createdAt: "desc" },
    skip,
    take: limit,
    select: {
      id: true,
      title: true,
      slug: true,
      description: true,
      content: true, // 썸네일용 이미지 추출을 위해 content 포함
      createdAt: true,
      views: true,
      author: {
        select: {
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

  const count = await db.post.count({
    where: { published: true },
  });

  return json({
    posts,
    pagination: {
      page,
      totalPages: Math.ceil(count / limit),
      totalItems: count,
    },
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

export default function BlogIndex() {
  const { posts, pagination } = useLoaderData<typeof loader>();

  return (
    <div>
      {posts.length === 0 ? (
        <div className="text-center py-12">
          <h2 className="text-xl font-medium text-gray-900">아직 작성된 글이 없습니다</h2>
          <p className="mt-1 text-gray-500">새로운 글을 작성해 보세요!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {posts.map((post, index) => {
            const imageUrl = extractFirstImageUrl(post.content);
            const randomColorClass = cardColors[index % cardColors.length];
            
            return (
              <Link 
                to={`/blog/${post.slug}`} 
                key={post.id}
                className="flex flex-col overflow-hidden rounded-lg shadow-lg hover:shadow-xl transition-shadow duration-300"
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
                  <div className="flex items-center justify-between mt-4 text-sm text-gray-500">
                    <div className="flex items-center">
                      {post.author.profileImage ? (
                        <img 
                          src={post.author.profileImage} 
                          alt={post.author.name}
                          className="w-5 h-5 rounded-full mr-2"
                        />
                      ) : (
                        <div className="w-5 h-5 rounded-full bg-gray-200 flex items-center justify-center mr-2">
                          <span className="text-xs">{post.author.name.charAt(0)}</span>
                        </div>
                      )}
                      <span>{post.author.name}</span>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <span className="flex items-center">
                        <Eye size={14} className="mr-1" />
                        {post.views}
                      </span>
                      <span>{formatDate(post.createdAt)}</span>
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
              (page) => (
                <Link
                  key={page}
                  to={`/blog?page=${page}`}
                  className={`px-3 py-2 rounded-md text-sm font-medium ${
                    page === pagination.page
                      ? "bg-blue-600 text-white"
                      : "bg-gray-100 text-gray-900 hover:bg-gray-200"
                  }`}
                >
                  {page}
                </Link>
              )
            )}
          </nav>
        </div>
      )}
    </div>
  );
}