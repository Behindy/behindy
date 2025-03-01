import { LoaderFunctionArgs, redirect } from "@remix-run/node";

// 기존 태그 검색 경로를 통합 검색 페이지로 리다이렉션
export async function loader({ params }: LoaderFunctionArgs) {
  const { tagName } = params;
  if (!tagName) return redirect("/blog");
  
  return redirect(`/blog/search?type=tag&q=${encodeURIComponent(tagName)}`);
}

// 컴포넌트도 필요하므로 빈 컴포넌트 제공
export default function TagRedirect() {
  return null;
}