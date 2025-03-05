import { json, redirect, ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { Form, useActionData, useNavigation, Link, useLoaderData } from "@remix-run/react";
import { useEffect, useRef, useState } from "react";
import { requireAuth } from "../utils/auth.server";
import { marked } from 'marked';
import hljs from 'highlight.js';
import 'highlight.js/styles/github.css';
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

export async function loader({ request }: LoaderFunctionArgs) {
  const user = await requireAuth(request);
  
  const url = new URL(request.url);
  const content = url.searchParams.get("content") || "";
  
  return json({ user, content });
}

export async function action({ request }: ActionFunctionArgs) {
  await requireAuth(request);
  const formData = await request.formData();
  
  const content = formData.get("content") as string;
  
  if (!content || typeof content !== "string") {
    return json<ActionData>({ error: "내용을 입력해주세요" }, { status: 400 });
  }
  
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
  
  useEffect(() => {
    if (actionData?.error && contentRef.current) {
      contentRef.current.focus();
    }
  }, [actionData]);
  
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
      
      <main className="w-full px-4 sm:px-6 lg:px-8 py-6">
        <div className="bg-white shadow rounded-lg">
          <Form method="post" className="p-6">
            <div className="mb-6">
              <p className="mb-4 text-gray-700">
                게시글 내용을 작성해주세요. 제목, 설명, 태그는 다음 단계에서 입력할 수 있습니다.
              </p>
              
              <ImageUploader onImageInsert={handleImageInsert} />
              
              <div className={`mt-2 ${isLargeScreen ? 'grid grid-cols-2 gap-4' : 'space-y-4'}`}>
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
            </div>
            
            <div className="flex justify-end space-x-4">
              <button
                type="submit"
                disabled={isSubmitting || !content.trim()}
                className={`px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 ${
                  (isSubmitting || !content.trim()) ? "opacity-50 cursor-not-allowed" : ""
                }`}
              >
                {isSubmitting ? "처리 중..." : "게시하기"}
              </button>
            </div>
          </Form>
        </div>
      </main>
    </div>
  );
}