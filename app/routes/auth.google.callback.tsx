import { LoaderFunctionArgs, redirect } from "@remix-run/node";
import { handleGoogleLogin } from "../utils/auth.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");

  if (!code) {
    return redirect("/login?error=no_code");
  }
  
  try {
    // 이 부분에서 리다이렉션이 발생해야 함
    return await handleGoogleLogin(code);
  } catch (error) {
    console.error("Google 인증 오류:", error);
    return redirect("/login?error=auth_failed");
  }
}

export default function GoogleCallback() {
  // const data = useLoaderData<typeof loader>();
  
  return (
    <div className="flex justify-center items-center min-h-screen">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-4">인증 처리 중...</h1>
        <p>잠시만 기다려주세요.</p>
      </div>
    </div>
  );
}