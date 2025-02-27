import { json, redirect, ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { Form, useActionData, useLoaderData, useNavigation } from "@remix-run/react";
import { useEffect, useRef, useState } from "react";
import { db } from "../utils/db.server";
import { requireAuth } from "../utils/auth.server";
import { marked } from 'marked';

// 서버에서 처리할 로더 함수
export async function loader({ request }: LoaderFunctionArgs) {
  // 인증된 사용자만 접근 가능
  const user = await requireAuth(request);
  
  // 모든 태그 가져오기
  const tags = await db.tag.findMany({
    orderBy: { name: "asc" },
  });
  
  return json({ user, tags });
}

type ActionData = {
  errors?: {
    title: string | null;
    content: string | null;
  };
};


// 서버에서 처리할 액션 함수
export async function action({ request }: ActionFunctionArgs) {
  const user = await requireAuth(request);
  
  const formData = await request.formData();
  const title = formData.get("title");
  const content = formData.get("content");
  const description = formData.get("description");
  const published = formData.get("published") === "true";
  const selectedTags = formData.getAll("tags");
  
  if (
    typeof title !== "string" ||
    typeof content !== "string" ||
    typeof description !== "string"
  ) {
    return json(
      { errors: { title: "Invalid form submission" } },
      { status: 400 }
    );
  }
  
  const errors = {
    title: title ? null : "제목을 입력해주세요",
    content: content ? null : "내용을 입력해주세요",
  };
  
  const hasErrors = Object.values(errors).some(Boolean);
  if (hasErrors) {
    return json({ errors }, { status: 400 });
  }
  
  // slug 생성 함수
  function createSlug(title: string) {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9가-힣]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }
  
  // 초기 slug 생성
  let slug = createSlug(title);
  
  // slug 중복 확인
  let existingPost = await db.post.findUnique({
    where: { slug },
  });
  
  // slug가 중복되면 숫자 추가
  if (existingPost) {
    let counter = 1;
    while (existingPost) {
      slug = `${createSlug(title)}-${counter}`;
      existingPost = await db.post.findUnique({
        where: { slug },
      });
      counter++;
    }
  }
  
  // 새 포스트 생성
  const post = await db.post.create({
    data: {
      title,
      slug,
      content,
      description,
      published,
      authorId: user.id,
      tags: {
        create: selectedTags.map((tagName) => ({
          tag: {
            connectOrCreate: {
              where: { name: tagName.toString() },
              create: { name: tagName.toString() },
            }
          }
        })),
      },
    },
  });
  
  return redirect(`/blog/${post.slug}`);
}

export default function NewPost() {
  const { tags } = useLoaderData<typeof loader>();
  const actionData = useActionData<ActionData>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";
  
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [content, setContent] = useState("");
  
  const titleRef = useRef<HTMLInputElement>(null);
  const contentRef = useRef<HTMLTextAreaElement>(null);
  
  // 에러 발생 시 해당 필드에 포커스
  useEffect(() => {
    if (actionData?.errors?.title) {
      titleRef.current?.focus();
    } else if (actionData?.errors?.content) {
      contentRef.current?.focus();
    }
  }, [actionData]);
  
  // 태그 선택 토글
  const toggleTag = (tagName: string) => {
    setSelectedTags((prev) => {
      if (prev.includes(tagName)) {
        return prev.filter((t) => t !== tagName);
      } else {
        return [...prev, tagName];
      }
    });
  };
  
  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">새 글 작성</h1>
      
      <Form method="post" className="space-y-6">
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
            제목
          </label>
          <input
            ref={titleRef}
            id="title"
            name="title"
            className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            aria-invalid={actionData?.errors?.title ? true : undefined}
            aria-errormessage={actionData?.errors?.title ? "title-error" : undefined}
          />
          {actionData?.errors?.title && (
            <div className="pt-1 text-red-700" id="title-error">
              {actionData.errors.title}
            </div>
          )}
        </div>
        
        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
            설명 (선택)
          </label>
          <input
            id="description"
            name="description"
            className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          />
        </div>
        
        <div>
          <div className="flex justify-between items-center mb-1">
            <label htmlFor="content" className="block text-sm font-medium text-gray-700">
              내용
            </label>
            <div className="flex space-x-2">
              <button
                type="button"
                onClick={() => setShowPreview(false)}
                className={`px-2 py-1 text-xs rounded-md ${
                  !showPreview
                    ? "bg-blue-100 text-blue-800"
                    : "bg-gray-100 text-gray-800"
                }`}
                >
                작성하기
              </button>
              <button
                type="button"
                onClick={() => setShowPreview(true)}
                className={`px-2 py-1 text-xs rounded-md ${
                  showPreview
                    ? "bg-blue-100 text-blue-800"
                    : "bg-gray-100 text-gray-800"
                }`}
                >
                미리보기
              </button>
            </div>
          </div>
          
          {!showPreview ? (
            <textarea
              ref={contentRef}
              id="content"
              name="content"
              rows={20}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 font-mono"
              onChange={(e) => setContent(e.target.value)}
              value={content}
              aria-invalid={actionData?.errors?.content ? true : undefined}
              aria-errormessage={
                actionData?.errors?.content ? "content-error" : undefined
              }
            />
          ) : (
            <div className="w-full h-96 overflow-auto p-4 border rounded-md bg-gray-50 prose">
              {content ? (
                <div dangerouslySetInnerHTML={{ __html: marked(content) }} />
              ) : (
                <p className="text-gray-400">내용을 입력하면 미리보기가 표시됩니다.</p>
              )}
            </div>
          )}
          
          {actionData?.errors?.content && (
            <div className="pt-1 text-red-700" id="content-error">
              {actionData.errors.content}
            </div>
          )}
          <p className="mt-1 text-sm text-gray-500">
            마크다운 형식으로 작성할 수 있습니다.
          </p>
        </div>
        
        <div>
          <span className="block text-sm font-medium text-gray-700 mb-2">
            태그 선택
          </span>
          <div className="flex flex-wrap gap-2">
            {tags.map((tag) => (
              <label key={tag.id} className="inline-flex items-center">
                <input
                  type="checkbox"
                  name="tags"
                  value={tag.name}
                  checked={selectedTags.includes(tag.name)}
                  onChange={() => toggleTag(tag.name)}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-700">{tag.name}</span>
              </label>
            ))}
          </div>
          <div className="mt-2">
            <label htmlFor="newTag" className="block text-sm text-gray-700">
              새 태그 추가:
            </label>
            <div className="mt-1 flex rounded-md shadow-sm">
              <input
                type="text"
                id="newTag"
                className="block w-full rounded-md border-gray-300 sm:text-sm"
                placeholder="태그 입력 후 추가 버튼 클릭"
              />
              <button
                type="button"
                onClick={() => {
                  const input = document.getElementById("newTag") as HTMLInputElement;
                  if (input.value.trim()) {
                    toggleTag(input.value.trim());
                    input.value = "";
                  }
                }}
                className="ml-2 inline-flex items-center rounded border border-transparent bg-blue-600 px-3 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700"
              >
                추가
              </button>
            </div>
          </div>
        </div>
        
        <div>
          <div className="flex items-center">
            <input
              id="published"
              name="published"
              type="checkbox"
              value="true"
              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor="published" className="ml-2 block text-sm text-gray-700">
              바로 발행하기 (체크하지 않으면 임시저장됩니다)
            </label>
          </div>
        </div>
        
        <div className="flex justify-end space-x-4">
          <button
            type="button"
            onClick={() => window.history.back()}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
          >
            취소
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className={`px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 ${
              isSubmitting ? "opacity-75 cursor-not-allowed" : ""
            }`}
          >
            {isSubmitting ? "저장 중..." : "저장하기"}
          </button>
        </div>
      </Form>
    </div>
  );
}