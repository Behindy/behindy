import { json, ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { Form, Link, useLoaderData, useNavigation } from "@remix-run/react";
import { db } from "../utils/db.server";
import { requireAuth } from "../utils/auth.server";
import { formatDate, formatNumber } from "../utils/format";
import { useState } from "react";

export async function loader({ request }: LoaderFunctionArgs) {
  const user = await requireAuth(request);
  
  // 사용자가 작성한 모든 포스트 가져오기
  const posts = await db.post.findMany({
    where: { authorId: user.id },
    orderBy: { createdAt: "desc" },
    include: {
      _count: {
        select: { comments: true }
      }
    }
  });
  
  // 조회수 통계
  const totalViews = posts.reduce((sum, post) => sum + post.views, 0);
  
  // 댓글 개수
  const totalComments = await db.comment.count({
    where: {
      post: {
        authorId: user.id
      }
    }
  });
  
  // 최근 7일간의 통계
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 7);
  
  const viewStats = await db.viewStats.findMany({
    where: {
      date: {
        gte: startDate
      }
    },
    orderBy: {
      date: "asc"
    }
  });
  
  return json({
    user,
    posts,
    stats: {
      totalPosts: posts.length,
      publishedPosts: posts.filter(post => post.published).length,
      draftPosts: posts.filter(post => !post.published).length,
      totalViews,
      totalComments,
      viewStats
    }
  });
}

export async function action({ request }: ActionFunctionArgs) {
  const user = await requireAuth(request);
  const formData = await request.formData();
  const intent = formData.get("_intent");
  
  if (intent === "delete-post") {
    const postId = formData.get("postId");
    
    if (typeof postId !== "string") {
      return json({ error: "Invalid post ID" }, { status: 400 });
    }
    
    // 포스트 존재 및 작성자 검증
    const post = await db.post.findUnique({
      where: { id: postId },
    });
    
    if (!post) {
      return json({ error: "Post not found" }, { status: 404 });
    }
    
    if (post.authorId !== user.id) {
      return json({ error: "Unauthorized" }, { status: 403 });
    }
    
    // 포스트 삭제
    await db.post.delete({
      where: { id: postId },
    });
    
    return json({ success: true });
  }
  
  if (intent === "toggle-publish") {
    const postId = formData.get("postId");
    
    if (typeof postId !== "string") {
      return json({ error: "Invalid post ID" }, { status: 400 });
    }
    
    // 포스트 존재 및 작성자 검증
    const post = await db.post.findUnique({
      where: { id: postId },
    });
    
    if (!post) {
      return json({ error: "Post not found" }, { status: 404 });
    }
    
    if (post.authorId !== user.id) {
      return json({ error: "Unauthorized" }, { status: 403 });
    }
    
    // 발행 상태 토글
    await db.post.update({
      where: { id: postId },
      data: { published: !post.published },
    });
    
    return json({ success: true });
  }
  
  return json({ error: "Invalid action" }, { status: 400 });
}

export default function BlogDashboard() {
  const { posts, stats } = useLoaderData<typeof loader>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";
  
  const [filterStatus, setFilterStatus] = useState<"all" | "published" | "draft">("all");
  
  // 필터링된 포스트 목록
  const filteredPosts = posts.filter(post => {
    if (filterStatus === "all") return true;
    if (filterStatus === "published") return post.published;
    if (filterStatus === "draft") return !post.published;
    return true;
  });
  
  return (
    <div className="max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">블로그 대시보드</h1>
      
      {/* 통계 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white shadow rounded-lg p-4">
          <h3 className="text-sm font-medium text-gray-500">총 게시글</h3>
          <p className="text-2xl font-semibold mt-1">{stats.totalPosts}</p>
        </div>
        <div className="bg-white shadow rounded-lg p-4">
          <h3 className="text-sm font-medium text-gray-500">발행된 게시글</h3>
          <p className="text-2xl font-semibold mt-1">{stats.publishedPosts}</p>
        </div>
        <div className="bg-white shadow rounded-lg p-4">
          <h3 className="text-sm font-medium text-gray-500">총 조회수</h3>
          <p className="text-2xl font-semibold mt-1">{formatNumber(stats.totalViews)}</p>
        </div>
        <div className="bg-white shadow rounded-lg p-4">
          <h3 className="text-sm font-medium text-gray-500">총 댓글</h3>
          <p className="text-2xl font-semibold mt-1">{formatNumber(stats.totalComments)}</p>
        </div>
      </div>
      
      {/* 게시글 관리 */}
      <div className="bg-white shadow rounded-lg p-6 mb-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-medium">내 게시글 관리</h2>
          <div className="flex space-x-2">
            <button
              onClick={() => setFilterStatus("all")}
              className={`px-3 py-1 text-sm rounded-md ${
                filterStatus === "all"
                  ? "bg-blue-100 text-blue-800"
                  : "bg-gray-100 text-gray-800"
              }`}
            >
              전체 ({stats.totalPosts})
            </button>
            <button
              onClick={() => setFilterStatus("published")}
              className={`px-3 py-1 text-sm rounded-md ${
                filterStatus === "published"
                  ? "bg-blue-100 text-blue-800"
                  : "bg-gray-100 text-gray-800"
              }`}
            >
              발행됨 ({stats.publishedPosts})
            </button>
            <button
              onClick={() => setFilterStatus("draft")}
              className={`px-3 py-1 text-sm rounded-md ${
                filterStatus === "draft"
                  ? "bg-blue-100 text-blue-800"
                  : "bg-gray-100 text-gray-800"
              }`}
            >
              임시저장 ({stats.draftPosts})
            </button>
          </div>
        </div>
        
        {filteredPosts.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500">게시글이 없습니다.</p>
            <Link
              to="/blog/new"
              className="mt-4 inline-block px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              새 글 작성하기
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    제목
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    작성일
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    상태
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    조회수
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    댓글
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    관리
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredPosts.map((post) => (
                  <tr key={post.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Link 
                        to={`/blog/${post.slug}`}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        {post.title.length > 40 
                          ? post.title.substring(0, 40) + "..." 
                          : post.title}
                      </Link>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(post.createdAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        post.published
                          ? "bg-green-100 text-green-800"
                          : "bg-yellow-100 text-yellow-800"
                      }`}>
                        {post.published ? "발행됨" : "임시저장"}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatNumber(post.views)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatNumber(post._count.comments)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex space-x-2 justify-end">
                        <Link
                          to={`/blog/${post.slug}/edit`}
                          className="text-indigo-600 hover:text-indigo-900"
                        >
                          편집
                        </Link>
                        <Form method="post" className="inline">
                          <input type="hidden" name="_intent" value="toggle-publish" />
                          <input type="hidden" name="postId" value={post.id} />
                          <button
                            type="submit"
                            disabled={isSubmitting}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            {post.published ? "비공개로 전환" : "발행하기"}
                          </button>
                        </Form>
                        <Form method="post" className="inline">
                          <input type="hidden" name="_intent" value="delete-post" />
                          <input type="hidden" name="postId" value={post.id} />
                          <button
                            type="submit"
                            disabled={isSubmitting}
                            className="text-red-600 hover:text-red-900"
                            onClick={(e) => {
                              if (!confirm("정말 삭제하시겠습니까?")) {
                                e.preventDefault();
                              }
                            }}
                          >
                            삭제
                          </button>
                        </Form>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}