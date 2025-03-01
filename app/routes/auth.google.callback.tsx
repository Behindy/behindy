import { LoaderFunctionArgs, redirect } from "@remix-run/node";
import { handleGoogleLogin } from "../utils/auth.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  
  console.log("Callback URL:", url.toString());
  
  if (!code) {
    console.error("No code provided in callback URL");
    return redirect("/login?error=no_code");
  }
  
  try {
    console.log("Handling Google login with code:", code.substring(0, 10) + "...");
    
    // 세션 생성 및 리디렉션 처리
    const response = await handleGoogleLogin(code);
    
    // 응답 객체 내용 확인
    console.log("Response headers:", Object.fromEntries(response.headers.entries()));
    console.log("Response status:", response.status);
    
    return response;
  } catch (error) {
    console.error("Error during Google authentication:", error);
    return redirect("/login?error=auth_failed");
  }
}

export default function GoogleCallback() {
  return (
    <div className="flex justify-center items-center min-h-screen">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-4">인증 처리 중...</h1>
        <p>곧 리다이렉트됩니다.</p>
      </div>
    </div>
  );
}