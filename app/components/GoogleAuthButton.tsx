import { useEffect, useRef, useState } from "react";

interface GoogleAuthButtonProps {
  googleClientId: string | undefined;
  onSuccess?: (credential: string) => void;
  buttonText?: string;
}

export default function GoogleAuthButton({
  googleClientId,
  onSuccess,
  buttonText = "Google로 로그인"
}: GoogleAuthButtonProps) {
  const buttonRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  
  // 모바일 감지
  useEffect(() => {
    const checkMobile = () => {
      const userAgent = navigator.userAgent || navigator.vendor;
      return /Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
    };
    
    setIsMobile(checkMobile());
  }, []);

  // Google 버튼 렌더링
  useEffect(() => {
    if (!googleClientId || typeof window === 'undefined' || !window.google || !buttonRef.current) return;

    try {
      window.google.accounts.id.initialize({
        client_id: googleClientId,
        callback: (response: { credential: string }) => {
          if (onSuccess && response.credential) {
            onSuccess(response.credential);
          } else {
            // 리디렉션 방식으로 서버에 토큰 전송
            fetch("/api/auth/google-token", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ token: response.credential }),
            })
              .then(res => res.json())
              .then(data => {
                if (data.success) {
                  window.location.href = "/";
                }
              })
              .catch(err => {
                console.error("Google 로그인 실패:", err);
              });
          }
        },
        auto_select: false,
        ux_mode: "popup",  // 모바일에서도 작동하도록 popup 사용
      });

      window.google.accounts.id.renderButton(buttonRef.current, {
        theme: "outline", 
        size: "large",
        width: 240
      });
    } catch (error) {
      console.error("Google 버튼 렌더링 오류:", error);
    }
  }, [googleClientId, onSuccess]);

  const handleMobileLogin = () => {
    if (!isMobile || !googleClientId) return;
    
    setIsLoading(true);
    
    // authUrl을 Chrome Custom Tabs로 열도록 수정
    // Android에서는 window.location 대신 intent:// URL 스키마 사용 고려
    const authUrl = `/auth/google?redirect=${encodeURIComponent(window.location.pathname)}`;
    
    // 외부 브라우저를 열거나 앱 스위칭 처리
    // 네이티브 앱이라면 기기의 기본 브라우저를 여는 로직 필요
    if (typeof window !== 'undefined') {
      // 모바일 브라우저로 판단되면 그냥 리다이렉트
      if (/Android|iPhone|iPad|iPod/i.test(navigator.userAgent) && 
          /Chrome|Safari|Firefox|MSIE|Trident/i.test(navigator.userAgent)) {
        window.location.href = authUrl;
      } else {
        // 앱 내부 웹뷰로 판단되면 사용자에게 외부 브라우저 사용 안내
        alert('Google 로그인을 위해 외부 브라우저로 이동합니다');
        window.location.href = authUrl;
      }
    }
  };

  return (
    <div className="w-full flex flex-col items-center">
      <div 
        ref={buttonRef} 
        id="google-signin-button"
        className={isMobile ? "hidden" : ""}
      ></div>
      
      {isMobile && (
        <button
          onClick={handleMobileLogin}
          disabled={isLoading}
          className="flex items-center justify-center gap-2 w-60 py-2 px-4 border border-gray-300 rounded-md bg-white text-gray-700 hover:bg-gray-50 font-medium"
        >
          {isLoading ? (
            <span>처리 중...</span>
          ) : (
            <>
              <svg width="18" height="18" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
              </svg>
              <span>{buttonText}</span>
            </>
          )}
        </button>
      )}
    </div>
  );
}