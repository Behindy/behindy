import { json, redirect, ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { Form, Link, useLoaderData, useSubmit } from "@remix-run/react";
import { useState } from "react";
import { db } from "../utils/db.server";
import { requireAuth } from "../utils/auth.server";
import { Eye } from "lucide-react";
import { formatDate } from "../utils/format";
import invariant from "tiny-invariant";

// 태그 관계 타입 정의
interface TagRelation {
  tag?: {
    id: string;
    name: string;
  };
  name?: string;
}

// 로더 데이터 타입 정의
interface LoaderData {
  post: {
    id: string;
    title: string;
    slug: string;
    content: string;
    description: string | null;
    published: boolean;
    views: number;
    tags: TagRelation[];
  };
  tags: {
    id: string;
    name: string;
  }[];
  user: {
    id: string;
    name: string;
    profileImage?: string | null;
  };
  content: string;
  currentSlug: string;
}

// 첫 번째 이미지 URL 추출 함수
function extractFirstImageUrl(content: string): string | null {
  const imgRegex = /!\[.*?\]\((.*?)\)/;
  const match = content.match(imgRegex);
  
  if (match && match[1]) {
    return match[1];
  }
  
  const htmlImgRegex = /<img.*?src=["'](.*?)["']/;
  const htmlMatch = content.match(htmlImgRegex);
  
  if (htmlMatch && htmlMatch[1]) {
    return htmlMatch[1];
  }
  
  return null;
}

// 서버에서 처리할 로더 함수
export async function loader({ request, params }: LoaderFunctionArgs) {
  const user = await requireAuth(request);
  const { slug } = params;
  invariant(slug, "Slug is required");
  
  // URL 쿼리 파라미터에서 데이터 가져오기
  const url = new URL(request.url);
  const content = url.searchParams.get("content") || "";
  const postId = url.searchParams.get("postId");
  const currentSlug = url.searchParams.get("currentSlug") || slug;
  
  // postId가 없으면 에러
  if (!postId) {
    return redirect(`/${slug}/edit`);
  }
  
  // 포스트 조회
  const post = await db.post.findUnique({
    where: { id: postId },
    include: {
      tags: {
        include: {
          tag: true
        }
      },
    },
  });
  
  if (!post) {
    throw new Response("Not Found", { status: 404 });
  }
  
  // 작성자만 수정 가능
  if (post.authorId !== user.id && user.role !== "ADMIN") {
    throw new Response("Unauthorized", { status: 403 });
  }
  
  // 모든 태그 가져오기
  const tags = await db.tag.findMany({
    orderBy: { name: "asc" },
  });
  
  return json({ post, tags, user, content, currentSlug });
}

// slug 생성 함수
function createSlug(title: string) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9가-힣]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

// 액션 함수 - 실제 게시글 수정
export async function action({ request }: ActionFunctionArgs) {
  const user = await requireAuth(request);
  
  const formData = await request.formData();
  const postId = formData.get("postId") as string;
  const title = formData.get("title") as string;
  const content = formData.get("content") as string;
  const description = formData.get("description") as string;
  const published = formData.get("published") === "true";
  const selectedTags = formData.getAll("tags").map(tag => tag.toString());
  const currentSlug = formData.get("currentSlug") as string;
  
  if (!postId) {
    return json(
      { error: "게시글 ID가 필요합니다" },
      { status: 400 }
    );
  }
  
  if (
    typeof title !== "string" ||
    typeof content !== "string" ||
    !title.trim()
  ) {
    return json(
      { error: "제목을 입력해주세요" },
      { status: 400 }
    );
  }
  
  // 포스트 존재 및 권한 확인
  const post = await db.post.findUnique({
    where: { id: postId },
  });
  
  if (!post) {
    return json(
      { error: "게시글을 찾을 수 없습니다" },
      { status: 404 }
    );
  }
  
  // 작성자만 수정 가능
  if (post.authorId !== user.id && user.role !== "ADMIN") {
    return json(
      { error: "게시글을 수정할 권한이 없습니다" },
      { status: 403 }
    );
  }
  
  try {
    // 제목이 변경되었을 경우에만 slug 업데이트
    let newSlug = currentSlug;
    if (title !== post.title) {
      // 초기 slug 생성
      newSlug = createSlug(title);

      // slug 중복 확인 (현재 포스트 제외)
      let existingPost = await db.post.findFirst({
        where: { 
          slug: newSlug,
          id: { not: post.id }
        },
      });

      // slug가 중복되면 숫자 추가
      if (existingPost) {
        let counter = 1;
        while (existingPost) {
          newSlug = `${createSlug(title)}-${counter}`;
          existingPost = await db.post.findFirst({
            where: { 
              slug: newSlug,
              id: { not: post.id }
            },
          });
          counter++;
        }
      }
    }
    
    // 먼저 기존 태그 관계 삭제
    await db.tagsOnPosts.deleteMany({
      where: {
        postId: post.id
      }
    });

    // 포스트 업데이트 (태그 없이)
    const updatedPost = await db.post.update({
      where: { id: post.id },
      data: {
        title,
        slug: newSlug,
        content,
        description,
        published,
      },
    });

    // 선택된 태그들에 대해 태그-포스트 관계 생성
    for (const tagName of selectedTags) {
      // 태그 찾기 또는 생성
      let tag = await db.tag.findUnique({
        where: { name: tagName }
      });
      
      if (!tag) {
        tag = await db.tag.create({
          data: { name: tagName }
        });
      }
      
      // 태그와 포스트 연결
      await db.tagsOnPosts.create({
        data: {
          postId: updatedPost.id,
          tagId: tag.id
        }
      });
    }

    return redirect(`/blog/${updatedPost.slug}`);
  } catch (error) {
    console.error("게시글 수정 오류:", error);
    return json(
      { error: "게시글 수정 중 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}

export default function PreviewEditPost() {
  const { post, tags, user, content, currentSlug } = useLoaderData<LoaderData>();
  const submit = useSubmit();
  
  // 상태
  const [title, setTitle] = useState(post.title);
  const [description, setDescription] = useState(post.description || "");
  const [published, setPublished] = useState(post.published);
  const [selectedTags, setSelectedTags] = useState<string[]>(
    post.tags.map((tagRelation) => tagRelation.tag?.name || "")
  );
  const [tagInput, setTagInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  
  // 이미지 URL 추출
  const imageUrl = extractFirstImageUrl(content);
  
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
  
  // 랜덤 색상 클래스
  const randomColorClass = cardColors[0]; // 미리보기에서는 첫 번째 색상 사용
  
  // 태그 관련 함수
  const handleTagInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // # 접두사가 없으면 자동으로 추가
    let value = e.target.value;
    if (value && !value.startsWith('#')) {
      value = '#' + value;
    }
    setTagInput(value);
  };
  
  const handleTagInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && tagInput.trim()) {
      e.preventDefault();
      addTag();
    }
  };
  
  const addTag = () => {
    if (tagInput.trim()) {
      // # 제거하고 추가
      const newTag = tagInput.trim().substring(1);
      
      if (newTag && !selectedTags.includes(newTag)) {
        setSelectedTags([...selectedTags, newTag]);
      }
      setTagInput("");
    }
  };
  
  const removeTag = (tagToRemove: string) => {
    setSelectedTags(selectedTags.filter(tag => tag !== tagToRemove));
  };
  
  const handleSuggestedTagClick = (tagName: string) => {
    if (!selectedTags.includes(tagName)) {
      setSelectedTags([...selectedTags, tagName]);
    }
  };
  
  // 폼 제출 핸들러
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    // 유효성 검사
    if (!title.trim()) {
      setError("제목을 입력해주세요");
      return;
    }
    
    setError(null);
    
    const formData = new FormData(e.currentTarget);
    formData.set("content", content);
    formData.set("postId", post.id);
    formData.set("currentSlug", currentSlug);
    
    // 선택된 태그 추가
    selectedTags.forEach(tag => {
      formData.append("tags", tag);
    });
    
    submit(formData, { method: "post" });
  };
  
  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow">
        <div className="w-full px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">게시글 정보 수정</h1>
          <div className="flex space-x-4">
            <Link 
              to={`/${currentSlug}/edit?content=${encodeURIComponent(content)}`}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
            >
              이전 단계로
            </Link>
          </div>
        </div>
      </header>
      
      {/* 메인 콘텐츠 */}
      <main className="w-full px-4 sm:px-6 lg:px-8 py-6">
        <div className="max-w-7xl mx-auto">
          <Form method="post" onSubmit={handleSubmit}>
            <input type="hidden" name="content" value={content} />
            <input type="hidden" name="postId" value={post.id} />
            <input type="hidden" name="currentSlug" value={currentSlug} />
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* 게시글 정보 입력 */}
              <div className="bg-white shadow rounded-lg p-6">
                <h2 className="text-xl font-semibold mb-4">게시글 정보</h2>
                
                {/* 에러 메시지 */}
                {error && (
                  <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-md">
                    {error}
                  </div>
                )}
                
                {/* 제목 입력 */}
                <div className="mb-4">
                  <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
                    제목 <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="title"
                    name="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full text-xl px-4 py-3 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    placeholder="제목을 입력하세요"
                    required
                  />
                </div>
                
                {/* 설명 입력 */}
                <div className="mb-4">
                  <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                    설명 (선택)
                  </label>
                  <textarea
                    id="description"
                    name="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={2}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 resize-none"
                    placeholder="게시글 목록에 표시될 간단한 설명을 입력하세요"
                  />
                </div>
                
                {/* 태그 입력 */}
                <div className="mb-6">
                  <label htmlFor="tag-input" className="block text-sm font-medium text-gray-700 mb-1">
                    태그 (# 입력 후 엔터로 추가)
                  </label>
                  <div className="flex flex-col space-y-2">
                    {/* 태그 입력 필드 */}
                    <input
                      id="tag-input"
                      type="text"
                      value={tagInput}
                      onChange={handleTagInputChange}
                      onKeyDown={handleTagInputKeyDown}
                      onBlur={addTag}
                      placeholder="#태그입력 (ex. #behindy)"
                      className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    />
                    
                    {/* 선택된 태그 표시 영역 */}
                    {selectedTags.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {selectedTags.map(tag => (
                          <div
                            key={tag}
                            className="flex items-center bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm"
                          >
                            #{tag}
                            <button
                              type="button"
                              onClick={() => removeTag(tag)}
                              className="ml-1.5 text-blue-600 hover:text-blue-800"
                            >
                              &times;
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {/* 태그 제안 영역 */}
                    {tags.length > 0 && (
                      <div className="mt-2">
                        <p className="text-sm text-gray-500 mb-1">추천 태그:</p>
                        <div className="flex flex-wrap gap-2">
                          {tags.map((tag) => (
                            <button
                              key={tag.id}
                              type="button"
                              onClick={() => handleSuggestedTagClick(tag.name)}
                              className={`px-2 py-1 text-xs rounded-md ${
                                selectedTags.includes(tag.name)
                                  ? "bg-blue-100 text-blue-800"
                                  : "bg-gray-100 text-gray-800 hover:bg-gray-200"
                              }`}
                            >
                              #{tag.name}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* 발행 옵션 */}
                <div className="bg-gray-50 p-4 rounded-md">
                  <div className="flex items-center mb-2">
                    <input
                      id="published"
                      name="published"
                      type="checkbox"
                      value="true"
                      checked={published}
                      onChange={(e) => setPublished(e.target.checked)}
                      className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <label htmlFor="published" className="ml-2 block text-sm text-gray-700">
                      바로 게시하기
                    </label>
                  </div>
                  
                  <p className="text-xs text-gray-500">
                    {published 
                      ? "게시글이 즉시 게시되어 모든 사용자에게 공개됩니다." 
                      : "게시글이 임시저장되며 다른 사용자에게 보이지 않습니다."}
                  </p>
                </div>
                
                {/* 저장 버튼 */}
                <div className="mt-6 flex justify-end">
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    {published ? "게시하기" : "임시저장"}
                  </button>
                </div>
              </div>
              
              {/* 카드 미리보기 */}
              <div className="bg-white shadow rounded-lg p-6">
                <h2 className="text-xl font-semibold mb-4">카드 미리보기</h2>
                <p className="text-gray-500 mb-4">블로그 목록에서 이 게시글은 다음과 같이 표시됩니다:</p>
                
                {/* 카드 미리보기 */}
                <div className="border rounded-lg overflow-hidden shadow-md max-w-md mx-auto">
                  <div className={`h-48 overflow-hidden ${!imageUrl ? randomColorClass : ''}`}>
                    {imageUrl ? (
                      <img 
                        src={imageUrl} 
                        alt={title || "제목 미입력"} 
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <span className="text-4xl font-bold text-gray-600 opacity-30">
                          {title ? title.charAt(0) : "?"}
                        </span>
                      </div>
                    )}
                  </div>
                  
                  <div className="p-4 bg-white">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-2">
                      {title || "제목을 입력하세요"}
                    </h3>
                    
                    {description && (
                      <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                        {description}
                      </p>
                    )}
                    
                    {selectedTags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-3">
                        {selectedTags.slice(0, 3).map((tag) => (
                          <span
                            key={tag}
                            className="px-2 py-1 text-xs bg-gray-100 text-gray-800 rounded-md"
                          >
                            {tag}
                          </span>
                        ))}
                        {selectedTags.length > 3 && (
                          <span className="px-2 py-1 text-xs bg-gray-100 text-gray-800 rounded-md">
                            +{selectedTags.length - 3}
                          </span>
                        )}
                      </div>
                    )}
                    
                    <div className="flex items-center justify-between text-sm text-gray-500">
                      <div className="flex items-center">
                        {user.profileImage ? (
                          <img 
                            src={user.profileImage} 
                            alt={user.name}
                            className="w-5 h-5 rounded-full mr-2"
                          />
                        ) : (
                          <div className="w-5 h-5 rounded-full bg-gray-200 flex items-center justify-center mr-2">
                            <span className="text-xs">{user.name.charAt(0)}</span>
                          </div>
                        )}
                        <span>{user.name}</span>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        <span className="flex items-center">
                          <Eye size={14} className="mr-1" />
                          {post.views}
                        </span>
                        <span>{formatDate(new Date())}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Form>
        </div>
      </main>
    </div>
  );
}