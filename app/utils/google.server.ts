import { OAuth2Client } from 'google-auth-library';

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '';
const BASE_URL = process.env.BASE_URL || 'http://localhost:5173';
const REDIRECT_URI = `${BASE_URL}/auth/google/callback`;

// console.log('=== Google OAuth 설정 정보 ===');
// console.log('CLIENT_ID:', GOOGLE_CLIENT_ID ? '설정됨' : '미설정');
// console.log('CLIENT_SECRET:', GOOGLE_CLIENT_SECRET ? '설정됨' : '미설정');
// console.log('BASE_URL:', BASE_URL);
// console.log('REDIRECT_URI:', REDIRECT_URI);

const oauth2Client = new OAuth2Client(
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  REDIRECT_URI
);

export function getGoogleAuthURL(originalRedirect = '/') {
  const scopes = [
    'https://www.googleapis.com/auth/userinfo.profile',
    'https://www.googleapis.com/auth/userinfo.email'
  ];

  const state = Buffer.from(JSON.stringify({ redirectPath: originalRedirect })).toString('base64');

  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: scopes,
    prompt: 'consent',
    include_granted_scopes: true,
    redirect_uri: REDIRECT_URI,
    state
  });
  
  // console.log('=== Google 인증 URL 생성 ===');
  // console.log('원본 리디렉션 경로:', originalRedirect);
  // console.log('사용된 리디렉션 URI:', REDIRECT_URI);
  // console.log('생성된 인증 URL:', authUrl);
  // console.log('state 값:', state);
  
  return authUrl;
}

export async function getGoogleTokens(code: string) {
  try {
    // console.log('=== Google 토큰 교환 시작 ===');
    // console.log('인증 코드:', code.substring(0, 10) + '...');
    
    const { tokens } = await oauth2Client.getToken(code);
    
    // console.log('토큰 교환 성공:');
    // console.log('액세스 토큰 존재:', !!tokens.access_token);
    // console.log('리프레시 토큰 존재:', !!tokens.refresh_token);
    // console.log('ID 토큰 존재:', !!tokens.id_token);
    // console.log('만료 시간:', tokens.expiry_date);
    
    return tokens;
  } catch (error) {
    console.error("=== Google 토큰 교환 오류 ===");
    console.error("Error getting Google tokens:", error);
    console.error("Error details:", error instanceof Error ? error.message : String(error));
    throw error;
  }
}

export async function getGoogleUserInfo(access_token: string) {
  try {
    // console.log('=== Google 사용자 정보 요청 시작 ===');
    // console.log('액세스 토큰:', access_token.substring(0, 10) + '...');
    
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
      console.error(`=== Google 사용자 정보 요청 실패 ===`);
      console.error(`상태 코드: ${response.status} ${response.statusText}`);
      console.error(`에러 응답: ${errorText}`);
      throw new Error(`Failed to fetch user info: ${response.status} ${response.statusText}`);
    }
    
    const userData = await response.json();
    
    return userData;
  } catch (error) {
    console.error("=== Google 사용자 정보 요청 오류 ===");
    console.error("Error getting user info:", error);
    throw error;
  }
}