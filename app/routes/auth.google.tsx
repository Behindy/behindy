import { LoaderFunctionArgs, json } from "@remix-run/node";
import { useLoaderData,  } from "@remix-run/react";
import { useState, useEffect } from "react";
import { getGoogleAuthURL } from "../utils/google.server";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function loader({ request }: LoaderFunctionArgs) {
  const googleAuthURL = getGoogleAuthURL();
  return json({ googleAuthURL });
}

export default function GoogleAuth() {
  const { googleAuthURL } = useLoaderData<typeof loader>();
  const [browserSupport] = useState<string | null>(null);
  
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
      
      if (isMobile) {
        const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
        
        if (isIOS) {
          window.location.href = googleAuthURL;
        } else {
          const intentURI = `intent://${googleAuthURL.replace(/^https?:\/\//, '')}#Intent;scheme=https;package=com.android.chrome;end`;
          
          try {
            window.location.href = intentURI;
            setTimeout(() => {
              if (document.hidden) return;
              window.location.href = googleAuthURL;
            }, 2000);
          } catch (e) {
            window.location.href = googleAuthURL;
          }
        }
      } else {
        window.location.href = googleAuthURL;
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
        
        {browserSupport && (
          <p className="mt-4 text-sm text-gray-500">{browserSupport}</p>
        )}
      </div>
    </div>
  );
}