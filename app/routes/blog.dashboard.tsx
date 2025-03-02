import { json, ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import {  Link, useLoaderData } from "@remix-run/react";
import { db } from "../utils/db.server";
import { requireAuth } from "../utils/auth.server";
import {  formatNumber } from "../utils/format";
import { useState } from "react";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts';

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

  // 모든 게시글 (플랫폼 전체 통계용)
  const allPosts = await db.post.findMany({
    where: { published: true },
    include: {
      author: {
        select: { name: true }
      },
      _count: {
        select: { comments: true }
      },
      tags: {
        include: {
          tag: true
        }
      }
    }
  });

  // 게시글 작성 빈도 데이터 (월별)
  const postsByMonth = allPosts.reduce((acc, post) => {
    const date = new Date(post.createdAt);
    const monthYear = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    
    if (!acc[monthYear]) {
      acc[monthYear] = 0;
    }
    acc[monthYear]++;
    return acc;
  }, {} as Record<string, number>);

  const postFrequencyData = Object.entries(postsByMonth).map(([month, count]) => ({
    month,
    count
  })).sort((a, b) => a.month.localeCompare(b.month)).slice(-12); // 최근 12개월

  // 인기 게시글 TOP 5
  const topPosts = [...allPosts]
    .sort((a, b) => b.views - a.views)
    .slice(0, 5)
    .map(post => ({
      title: post.title.length > 30 ? post.title.substring(0, 30) + '...' : post.title,
      views: post.views,
      slug: post.slug
    }));

  // 태그별 게시글 수
  const tagCountMap = new Map<string, number>();
  allPosts.forEach(post => {
    post.tags.forEach(tagRelation => {
      const tagName = tagRelation.tag.name;
      tagCountMap.set(tagName, (tagCountMap.get(tagName) || 0) + 1);
    });
  });

  const tagData = Array.from(tagCountMap.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10); // 상위 10개 태그만

  // 사용자별 게시글 수
  const userPostCounts = allPosts.reduce((acc, post) => {
    const author = post.author.name;
    if (!acc[author]) {
      acc[author] = 0;
    }
    acc[author]++;
    return acc;
  }, {} as Record<string, number>);

  const authorData = Object.entries(userPostCounts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10); // 상위 10명만

  // 게시글당 평균 댓글 수
  const totalPostsCount = allPosts.length;
  const totalCommentsCount = allPosts.reduce((sum, post) => sum + post._count.comments, 0);
  const avgCommentsPerPost = totalPostsCount > 0 ? totalCommentsCount / totalPostsCount : 0;

  // 게시글당 평균 조회수
  const totalViewsCount = allPosts.reduce((sum, post) => sum + post.views, 0);
  const avgViewsPerPost = totalPostsCount > 0 ? totalViewsCount / totalPostsCount : 0;

  // 모바일 vs 데스크톱 더미 데이터 (실제 데이터가 없으므로)
  const platformData = [
    { name: '데스크톱', value: 65 },
    { name: '모바일', value: 30 },
    { name: '태블릿', value: 5 }
  ];

  return json({
    user,
    posts,
    stats: {
      totalPosts: posts.length,
      publishedPosts: posts.filter(post => post.published).length,
      draftPosts: posts.filter(post => !post.published).length,
      totalViews,
      totalComments,
      viewStats,
      // 추가 통계 데이터
      postFrequencyData,
      topPosts,
      tagData,
      authorData,
      avgCommentsPerPost,
      avgViewsPerPost,
      platformData,
      // 플랫폼 전체 통계
      platformTotalPosts: allPosts.length,
      platformTotalComments: totalCommentsCount,
      platformTotalViews: totalViewsCount
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

// 도넛 차트의 색상 배열
const COLORS = [
  '#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8',
  '#82ca9d', '#ffc658', '#8dd1e1', '#a4de6c', '#d0ed57'
];

export default function BlogDashboard() {
  const { stats } = useLoaderData<typeof loader>();
  
  const [activeTab, setActiveTab] = useState<"my-posts" | "statistics">("statistics");
  
  
  return (
    <div className="max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">블로그 대시보드</h1>
      
      {/* 탭 네비게이션 */}
      <div className="flex border-b border-gray-200 mb-8">
        {/* <button
          className={`px-4 py-2 font-medium ${
            activeTab === "my-posts" 
              ? "text-blue-600 border-b-2 border-blue-600" 
              : "text-gray-500 hover:text-gray-700"
          }`}
          onClick={() => setActiveTab("my-posts")}
        >
          내 게시글 관리
        </button> */}
        <button
          className={`px-4 py-2 font-medium ${
            activeTab === "statistics" 
              ? "text-blue-600 border-b-2 border-blue-600" 
              : "text-gray-500 hover:text-gray-700"
          }`}
          onClick={() => setActiveTab("statistics")}
        >
          블로그 통계
        </button>
      </div>
      
      {activeTab === "my-posts" ? (
        <>

        </>
      ) : (
        /* 통계 대시보드 */
        <div>
          {/* 주요 통계 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-800 mb-4">플랫폼 개요</h3>
              <div className="grid grid-cols-1 gap-4">
                <div className="flex justify-between items-center p-3 bg-blue-50 rounded-md">
                  <span className="text-blue-800">총 게시글</span>
                  <span className="text-lg font-medium">{formatNumber(stats.platformTotalPosts)}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-green-50 rounded-md">
                  <span className="text-green-800">총 조회수</span>
                  <span className="text-lg font-medium">{formatNumber(stats.platformTotalViews)}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-purple-50 rounded-md">
                  <span className="text-purple-800">총 댓글</span>
                  <span className="text-lg font-medium">{formatNumber(stats.platformTotalComments)}</span>
                </div>
              </div>
            </div>
            
            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-800 mb-4">게시글당 평균</h3>
              <div className="flex flex-col space-y-4">
                <div>
                  <p className="text-gray-600 mb-1">평균 댓글 수</p>
                  <div className="flex items-center">
                    <span className="text-2xl font-semibold text-blue-600">{stats.avgCommentsPerPost.toFixed(1)}</span>
                    <span className="ml-2 text-sm text-gray-500">댓글/게시글</span>
                  </div>
                </div>
                <div>
                  <p className="text-gray-600 mb-1">평균 조회수</p>
                  <div className="flex items-center">
                    <span className="text-2xl font-semibold text-green-600">{Math.round(stats.avgViewsPerPost)}</span>
                    <span className="ml-2 text-sm text-gray-500">조회수/게시글</span>
                  </div>
                </div>
              </div>
            </div>
            
            {/* <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-800 mb-4">플랫폼별 접속 비율</h3>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={stats.platformData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {stats.platformData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-2 text-xs text-gray-500 text-center">* 예시 데이터입니다</div> */}
            {/* </div> */}
          </div>
          
          {/* 게시글 작성 빈도 */}
          <div className="bg-white shadow rounded-lg p-6 mb-8">
            <h3 className="text-lg font-medium text-gray-800 mb-4">게시글 작성 빈도 (월별)</h3>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={stats.postFrequencyData}
                  margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip formatter={(value: number) => [`${value}개`, '게시글 수']} />
                  <Bar dataKey="count" name="게시글 수" fill="#3B82F6" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          
          {/* 두 번째 행: 인기 게시글과 태그 분포 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {/* 인기 게시글 TOP 5 */}
            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-800 mb-4">인기 게시글 TOP 5</h3>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    layout="vertical"
                    data={stats.topPosts}
                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis type="category" dataKey="title" width={150} tick={{ fontSize: 12 }} />
                    <Tooltip formatter={(value: number) => [`${value}회`, '조회수']} />
                    <Bar dataKey="views" name="조회수" fill="#10B981" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-4">
                <ul className="space-y-2">
                  {stats.topPosts.map((post, index) => (
                    <li key={index} className="flex items-center justify-between">
                      <Link to={`/blog/${post.slug}`} className="text-sm text-blue-600 hover:underline truncate max-w-xs">
                        {post.title}
                      </Link>
                      <span className="text-sm text-gray-500">{formatNumber(post.views)} 조회</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            
            {/* 태그별 게시글 수 */}
            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-800 mb-4">태그별 게시글 수</h3>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={stats.tagData}
                      cx="50%"
                      cy="50%"
                      labelLine={true}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="count"
                      nameKey="name"
                    >
                      {stats.tagData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number, name: string) => [`${value}개`, name]} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-4">
                <ul className="space-y-1">
                  {stats.tagData.slice(0, 5).map((tag, index) => (
                    <li key={index} className="flex items-center justify-between">
                      <Link to={`/blog/search?type=tag&q=${tag.name}`} className="text-sm text-blue-600 hover:underline">
                        #{tag.name}
                      </Link>
                      <span className="text-sm text-gray-500">{tag.count}개</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
          
          {/* 세 번째 행: 활동량 랭킹 */}
          <div className="grid grid-cols-1 mb-8">
            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-800 mb-4">사용자별 게시글 수 (활동량 랭킹)</h3>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={stats.authorData}
                    margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip formatter={(value: number) => [`${value}개`, '게시글 수']} />
                    <Bar dataKey="count" name="게시글 수" fill="#8B5CF6" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-4">
                <ul className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {stats.authorData.map((author, index) => (
                    <li key={index} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                      <div className="flex items-center">
                        <span className="w-6 h-6 bg-purple-100 text-purple-800 rounded-full flex items-center justify-center text-xs font-bold mr-2">
                          {index + 1}
                        </span>
                        <span className="text-sm font-medium">{author.name}</span>
                      </div>
                      <span className="text-sm text-gray-500">{author.count}개</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}