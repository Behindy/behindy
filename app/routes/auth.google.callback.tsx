import { LoaderFunctionArgs, redirect } from "@remix-run/node";
import { handleGoogleLogin } from "../utils/auth.server";

export async function loader({ request }: LoaderFunctionArgs) {
  // // console.log('=== auth.google.callback.tsx 로더 시작 ===');
  // // console.log('요청 URL:', request.url);
  
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");
  
  // // console.log('응답 코드 존재:', !!code);
  // // console.log('상태 토큰 존재:', !!state);
  // // console.log('에러 파라미터:', error);
  
  let redirectPath = "/";
  
  if (state) {
    try {
      const decodedState = JSON.parse(Buffer.from(state, 'base64').toString());
      redirectPath = decodedState.redirectPath || '/';
      // // console.log('디코딩된 상태:', decodedState);
      // // console.log('리디렉션 경로:', redirectPath);
    } catch (e) {
      console.error("상태 파라미터 파싱 오류:", e);
    }
  }
  
  if (error) {
    console.error('Google 인증 오류:', error);
    return redirect(`/login?error=${error}&redirect=${encodeURIComponent(redirectPath)}`);
  }
  
  if (!code) {
    console.error("인증 코드가 없습니다");
    return redirect(`/login?error=no_code&redirect=${encodeURIComponent(redirectPath)}`);
  }
  
  try {
    // console.log('토큰 교환 시작...');
    const response = await handleGoogleLogin(code, redirectPath);
    // console.log('토큰 교환 및 사용자 인증 성공');
    
    return response;
  } catch (error) {
    console.error("Google 인증 처리 중 오류:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return redirect(`/login?error=auth_failed&message=${encodeURIComponent(errorMessage)}&redirect=${encodeURIComponent(redirectPath)}`);
  }
}

export default function GoogleCallback() {
  return (
    <div className="flex justify-center items-center min-h-screen">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-4">인증 처리 중...</h1>
        <p>곧 리다이렉트됩니다.</p>
        <div className="mt-6 p-4 bg-gray-100 rounded max-w-md mx-auto">
          <p className="text-sm">디버깅: 이 페이지를 확인하는 중이면 이미 Google에서 인증 코드를 받았으나,
            서버 측 처리 과정에서 문제가 발생했을 수 있습니다.</p>
          <p className="text-sm mt-2">브라우저 콘솔과 서버 로그를 확인해 주세요.</p>
        </div>
      </div>
    </div>
  );
}