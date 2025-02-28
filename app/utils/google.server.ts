import { OAuth2Client } from 'google-auth-library';

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '';
const REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || 'https://behindy.me/auth/google/callback';

// OAuth 클라이언트 생성
const oauth2Client = new OAuth2Client(
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  REDIRECT_URI
);

// Google 로그인 URL 생성
export function getGoogleAuthURL() {
  const scopes = [
    'https://www.googleapis.com/auth/userinfo.profile',
    'https://www.googleapis.com/auth/userinfo.email'
  ];

  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: scopes,
    prompt: 'select_account'
  });
}

// 인증 코드로 토큰 교환
export async function getGoogleTokens(code: string) {
  const { tokens } = await oauth2Client.getToken(code);
  return tokens;
}

// Google 사용자 정보 가져오기
export async function getGoogleUserInfo(access_token: string) {
  const response = await fetch(
    `https://www.googleapis.com/oauth2/v1/userinfo?alt=json&access_token=${access_token}`,
    {
      headers: {
        Authorization: `Bearer ${access_token}`,
      },
    }
  );
  
  if (!response.ok) {
    throw new Error('Failed to fetch user info from Google');
  }
  
  return response.json();
}