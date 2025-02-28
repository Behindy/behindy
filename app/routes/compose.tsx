// blog.compose.tsx - 게시글 작성 페이지 (콘텐츠만 작성)
import { json, redirect, ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { Form, useActionData, useNavigation, Link, useLoaderData } from "@remix-run/react";
import { useEffect, useRef, useState } from "react";
import { requireAuth } from "../utils/auth.server";
import { marked } from 'marked';
import hljs from 'highlight.js';
import 'highlight.js/styles/github.css'; // 원하는 스타일 선택
import DOMPurify from 'dompurify';
import ImageUploader from "../components/ImageUploader";

interface ActionData {
  error?: string;
}

// 마크다운 설정
marked.setOptions({
  // @ts-expect-error - highlight.js와 함께 사용할 때 발생하는 타입 문제
  highlight: function(code: string, lang: string) {
    if (lang && hljs.getLanguage(lang)) {
      return hljs.highlight(code, { language: lang }).value;
    }
    return hljs.highlightAuto(code).value;
  },
  gfm: true,        // GitHub Flavored Markdown 활성화
  breaks: true,     // 줄바꿈 활성화
  smartLists: true, // 더 나은 리스트 렌더링
  smartypants: true // 더 나은 인용 및 대시 렌더링
});

function renderMarkdown(content: string): string {
  if (!content.trim()) return '';
  
  try {
    const renderedHtml = marked.parse(content) as string;
    if (typeof DOMPurify !== 'undefined') {
      return DOMPurify.sanitize(renderedHtml);
    }
    return renderedHtml;
  } catch (error) {
    console.error('Markdown rendering error:', error);
    return `<p class="text-red-600">마크다운 렌더링 오류가 발생했습니다.</p>`;
  }
}

// 미디어 쿼리 훅
function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const media = window.matchMedia(query);
      setMatches(media.matches);

      const listener = (event: MediaQueryListEvent) => {
        setMatches(event.matches);
      };

      media.addEventListener("change", listener);
      return () => {
        media.removeEventListener("change", listener);
      };
    }
  }, [query]);

  return matches;
}

// 서버에서 처리할 로더 함수
export async function loader({ request }: LoaderFunctionArgs) {
  // 인증된 사용자만 접근 가능
  const user = await requireAuth(request);
  
  // URL 쿼리 파라미터에서 content 가져오기
  const url = new URL(request.url);
  const content = url.searchParams.get("content") || "";
  
  return json({ user, content });
}

// 액션 함수에서는 미리보기 페이지로 리다이렉트
export async function action({ request }: ActionFunctionArgs) {
  await requireAuth(request);
  const formData = await request.formData();
  
  const content = formData.get("content") as string;
  
  if (!content || typeof content !== "string") {
    return json<ActionData>({ error: "내용을 입력해주세요" }, { status: 400 });
  }
  
  // 미리보기 페이지로 리다이렉트
  return redirect("/blog/preview?" + new URLSearchParams({
    content
  }));
}

export default function ComposePost() {
  const { content: initialContent } = useLoaderData<typeof loader>();
  
  const [content, setContent] = useState(initialContent);
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";
  
  const contentRef = useRef<HTMLTextAreaElement>(null);
  const isLargeScreen = useMediaQuery("(min-width: 1024px)");
  
  // 에러 발생 시 해당 필드에 포커스
  useEffect(() => {
    if (actionData?.error && contentRef.current) {
      contentRef.current.focus();
    }
  }, [actionData]);
  
  // 이미지 삽입 처리 함수
  const handleImageInsert = (imageUrl: string) => {
    const markdownImage = `![image](${imageUrl})`;
    
    if (contentRef.current) {
      const textarea = contentRef.current;
      const startPos = textarea.selectionStart;
      const endPos = textarea.selectionEnd;
      
      const newContent = 
        content.substring(0, startPos) + 
        markdownImage + 
        content.substring(endPos);
      
      setContent(newContent);
      
      setTimeout(() => {
        textarea.focus();
        const newCursorPos = startPos + markdownImage.length;
        textarea.setSelectionRange(newCursorPos, newCursorPos);
      }, 0);
    } else {
      setContent(prevContent => prevContent + '\n' + markdownImage);
    }
  };
  
  return (
    <div className="min-h-screen bg-gray-100">
      {/* 헤더 부분 - 취소 버튼만 상단에 위치 */}
      <header className="bg-white shadow">
        <div className="w-full px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">게시글 작성</h1>
          <div className="flex space-x-4">
            <Link 
              to="/blog"
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
            >
              취소
            </Link>
          </div>
        </div>
      </header>
      
      {/* 메인 콘텐츠 */}
      <main className="w-full px-4 sm:px-6 lg:px-8 py-6">
        <div className="bg-white shadow rounded-lg">
          <Form method="post" className="p-6">
            {/* 내용 입력 영역 */}
            <div className="mb-6">
              <p className="mb-4 text-gray-700">
                게시글 내용을 작성해주세요. 제목, 설명, 태그는 다음 단계에서 입력할 수 있습니다.
              </p>
              
              {/* 이미지 업로더 */}
              <ImageUploader onImageInsert={handleImageInsert} />
              
              {/* 큰 화면에서는 1:1 비율로 나란히 배치, 작은 화면에서는 스택 */}
              <div className={`mt-2 ${isLargeScreen ? 'grid grid-cols-2 gap-4' : 'space-y-4'}`}>
                {/* 작성 영역 */}
                <div>
                  <div className="mb-1 flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-500">작성</span>
                  </div>
                  <textarea
                    ref={contentRef}
                    id="content"
                    name="content"
                    rows={30}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 font-mono resize-none"
                    onChange={(e) => setContent(e.target.value)}
                    value={content}
                    placeholder="마크다운 형식으로 내용을 작성하세요..."
                    required
                  />
                  {actionData?.error && (
                    <div className="text-red-600 text-sm mt-1">{actionData.error}</div>
                  )}
                </div>
                
                {/* 미리보기 영역 */}
                <div>
                  <div className="mb-1">
                    <span className="text-sm font-medium text-gray-500">미리보기</span>
                  </div>
                  <div className="w-full h-[720px] overflow-auto p-4 border rounded-md bg-gray-50 prose prose-blue max-w-none">
                    {content ? (
                      <div dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }} />
                    ) : (
                      <p className="text-gray-400">내용을 입력하면 미리보기가 표시됩니다.</p>
                    )}
                  </div>
                </div>
              </div>
              
              <p className="mt-1 text-sm text-gray-500">
                마크다운 형식으로 작성할 수 있습니다. 첫 번째 이미지는 카드의 썸네일로 사용됩니다.
              </p>
            </div>
            
            {/* 버튼 영역 */}
            <div className="flex justify-end space-x-4">
              <button
                type="submit"
                disabled={isSubmitting || !content.trim()}
                className={`px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 ${
                  (isSubmitting || !content.trim()) ? "opacity-50 cursor-not-allowed" : ""
                }`}
              >
                {isSubmitting ? "처리 중..." : "다음: 정보 입력하기"}
              </button>
            </div>
          </Form>
        </div>
      </main>
    </div>
  );
}