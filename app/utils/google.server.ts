import { OAuth2Client } from 'google-auth-library';

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '';
const REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI;

// 환경 변수 로깅 함수 추가
function logGoogleEnvVars() {
  console.log('=== Google OAuth Environment Variables ===');
  console.log(`GOOGLE_CLIENT_ID: ${GOOGLE_CLIENT_ID ? '설정됨 (값 숨김)' : '설정되지 않음'}`);
  console.log(`GOOGLE_CLIENT_SECRET: ${GOOGLE_CLIENT_SECRET ? '설정됨 (값 숨김)' : '설정되지 않음'}`);
  console.log(`REDIRECT_URI: ${REDIRECT_URI || '설정되지 않음'}`);
  console.log('========================================');
}

// OAuth 클라이언트 생성
const oauth2Client = new OAuth2Client(
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  REDIRECT_URI
);

// Google 로그인 URL 생성 (로깅 추가)
export function getGoogleAuthURL() {
  // 환경 변수 로깅
  logGoogleEnvVars();
  
  const scopes = [
    'https://www.googleapis.com/auth/userinfo.profile',
    'https://www.googleapis.com/auth/userinfo.email'
  ];

  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: scopes,
    prompt: 'select_account'
  });
  
  console.log('Generated Google Auth URL:', authUrl);
  return authUrl;
}

// 인증 코드로 토큰 교환 (로깅 추가)
export async function getGoogleTokens(code: string) {
  try {
    // 환경 변수 로깅
    logGoogleEnvVars();
    
    console.log("Getting tokens with code:", code.substring(0, 10) + "...");
    console.log("Using Redirect URI:", REDIRECT_URI);
    
    const { tokens } = await oauth2Client.getToken(code);
    console.log("Tokens received successfully");
    
    return tokens;
  } catch (error) {
    console.error("Error getting Google tokens:", error);
    console.error("Error details:", error instanceof Error ? error.message : String(error));
    throw error;
  }
}

// Google 사용자 정보 가져오기
export async function getGoogleUserInfo(access_token: string) {
  console.log("Fetching user info with access token");
  
  try {
    const response = await fetch(
      `https://www.googleapis.com/oauth2/v1/userinfo?alt=json&access_token=${access_token}`,
      {
        headers: {
          Authorization: `Bearer ${access_token}`,
        },
      }
    );
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Failed to fetch user info: ${response.status} ${response.statusText}`);
      console.error(`Error response: ${errorText}`);
      throw new Error(`Failed to fetch user info: ${response.status} ${response.statusText}`);
    }
    
    const userData = await response.json();
    console.log("User info retrieved successfully:", userData.email);
    return userData;
  } catch (error) {
    console.error("Error getting user info:", error);
    throw error;
  }
}