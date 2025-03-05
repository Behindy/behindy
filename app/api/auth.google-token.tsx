import { ActionFunctionArgs, json } from "@remix-run/node";
import { OAuth2Client } from "google-auth-library";
import { createUserSession } from "../utils/auth.server";
import { db } from "../utils/db.server";
import { 
  generateAccessToken, 
  generateRefreshToken, 
  saveRefreshToken 
} from "../utils/jwt.server";

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

export async function action({ request }: ActionFunctionArgs) {
  const { token } = await request.json();

  try {
    // ID 토큰 검증
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const tokenPayload = ticket.getPayload();
    if (!tokenPayload || !tokenPayload.email) {
      return json({ success: false, error: "Invalid token" }, { status: 400 });
    }

    // 사용자 정보 추출
    const { email, name, picture } = tokenPayload;

    // 기존 사용자 확인 또는 새 사용자 생성
    let user = await db.user.findUnique({ where: { email: email } });
    
    if (!user) {
      // 새 사용자 생성
      user = await db.user.create({
        data: {
          email: email,
          name: name || email.split('@')[0],
          password: '',  // 소셜 로그인은 비밀번호 없음
          profileImage: picture,
        },
      });
    }

    // JWT 페이로드 생성 및 세션 생성
    const jwtPayload = {
      userId: user.id,
      email: user.email,
      role: user.role
    };
    
    const accessToken = generateAccessToken(jwtPayload);
    const refreshToken = generateRefreshToken(jwtPayload);
    await saveRefreshToken(user.id, refreshToken);
    
    // 세션 생성 및 응답
    return createUserSession(accessToken, user.id, "/");
    
  } catch (error) {
    console.error("Google token verification error:", error);
    return json({ success: false, error: "Authentication failed" }, { status: 500 });
  }
}