import { LoaderFunctionArgs, json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { useState, useEffect } from "react";
import { getGoogleAuthURL } from "../utils/google.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const redirectPath = url.searchParams.get("redirect") || "/";
  
  // console.log('=== auth.google.tsx 로더 시작 ===');
  // console.log('요청 URL:', request.url);
  // console.log('리디렉션 경로:', redirectPath);
  
  const googleAuthURL = getGoogleAuthURL(redirectPath);
  
  // console.log('생성된 Google 인증 URL:', googleAuthURL);
  
  return json({ googleAuthURL });
}

export default function GoogleAuth() {
  const { googleAuthURL } = useLoaderData<typeof loader>();
  const [browserInfo, setBrowserInfo] = useState<string | null>(null);
  
  useEffect(() => {
    // console.log('=== 클라이언트 사이드 디버깅 ===');
    // console.log('현재 페이지 URL:', window.location.href);
    // console.log('Google 인증 URL:', googleAuthURL);
    
    try {
      const url = new URL(googleAuthURL);
      // console.log('인증 URL 호스트:', url.host);
      // console.log('인증 URL 경로:', url.pathname);
      // console.log('인증 URL 쿼리 파라미터:');
      url.searchParams.forEach((value, key) => {
        if (key === 'state') {
          // console.log(`  ${key}: ${value.substring(0, 10)}...`);
        } else if (key === 'client_id' || key === 'redirect_uri') {
          // console.log(`  ${key}: ${value}`);
        } else {
          // console.log(`  ${key}: ${value}`);
        }
      });
    } catch (e) {
      console.error('URL 파싱 오류:', e);
    }
    
    // 환경 정보 수집
    if (typeof window !== 'undefined') {
      const userAgent = navigator.userAgent;
      const isMobile = /Android|iPhone|iPad|iPod/i.test(userAgent);
      
      if (isMobile) {
        const isIOS = /iPhone|iPad|iPod/i.test(userAgent);
        const isAndroid = /Android/i.test(userAgent);
        const deviceType = isIOS ? "iOS" : isAndroid ? "Android" : "기타 모바일";
        
        // console.log('감지된 환경:', deviceType);
        setBrowserInfo(deviceType);
        
        // console.log('모바일 환경 - 인증 URL로 리디렉션 중...');
        setTimeout(() => {
          window.location.href = googleAuthURL;
        }, 1000);
      } else {
        // console.log('감지된 환경: 데스크톱');
        setBrowserInfo("데스크톱");
        
        // console.log('데스크톱 환경 - 인증 URL로 리디렉션 중...');
        setTimeout(() => {
          window.location.href = googleAuthURL;
        }, 1000);
      }
    }
  }, [googleAuthURL]);
  
  return (
    <div className="flex justify-center items-center min-h-screen">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-4">Google 로그인으로 이동 중...</h1>
        <p className="mb-4">자동으로 리디렉션되지 않으면 아래 버튼을 클릭하세요.</p>
        <a 
          href={googleAuthURL} 
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Google 로그인으로 이동
        </a>
        
        {browserInfo && (
          <p className="mt-4 text-sm text-gray-500">감지된 환경: {browserInfo}</p>
        )}
        
        <div className="mt-6 text-left p-4 bg-gray-100 rounded text-xs overflow-auto max-w-xl mx-auto max-h-60">
          <p className="font-bold mb-2">디버깅 정보:</p>
          <p>URL: <span id="debug-url" className="font-mono">{typeof window !== 'undefined' ? window.location.href : ''}</span></p>
          <p>인증 URL: <span id="debug-auth-url" className="font-mono whitespace-normal break-all">{googleAuthURL}</span></p>
          <p>리디렉션 URI: <span id="debug-redirect-uri" className="font-mono">
            {typeof window !== 'undefined' && googleAuthURL 
              ? new URL(googleAuthURL).searchParams.get('redirect_uri') 
              : '로딩 중...'}
          </span></p>
        </div>
      </div>
    </div>
  );
}