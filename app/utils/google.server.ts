import { OAuth2Client } from 'google-auth-library';

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '';
const REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI;

// OAuth 클라이언트 생성
const oauth2Client = new OAuth2Client(
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  REDIRECT_URI
);

// Google 로그인 URL 생성 (로깅 추가)
export function getGoogleAuthURL() {
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

    const { tokens } = await oauth2Client.getToken(code);
    return tokens;
  } catch (error) {
    console.error("Error getting Google tokens:", error);
    console.error("Error details:", error instanceof Error ? error.message : String(error));
    throw error;
  }
}

// Google 사용자 정보 가져오기
export async function getGoogleUserInfo(access_token: string) {
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
    return userData;
  } catch (error) {
    console.error("Error getting user info:", error);
    throw error;
  }
}