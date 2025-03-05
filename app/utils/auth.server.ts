import { createCookieSessionStorage, redirect, SessionData } from "@remix-run/node";
import { db } from "./db.server";
import bcrypt from "bcryptjs";
import { 
  generateAccessToken, 
  generateRefreshToken, 
  saveRefreshToken, 
  verifyAccessToken, 
  verifyRefreshToken 
} from "./jwt.server";
import { getGoogleTokens, getGoogleUserInfo} from "./google.server";

type LoginForm = {
  email: string;
  password: string;
};

type RegisterForm = LoginForm & {
  name: string;
};

export const sessionStorage = createCookieSessionStorage({
  cookie: {
    name: "behindy_session",
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    secrets: ["s3cr3t"],
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 7, // 1주일
  },
});

export async function login({ email, password }: LoginForm) {
  const user = await db.user.findUnique({
    where: { email },
  });
  if (!user) return null;

  const isCorrectPassword = await bcrypt.compare(password, user.password);
  if (!isCorrectPassword) return null;

  // JWT 페이로드 생성
  const payload = {
    userId: user.id,
    email: user.email,
    role: user.role
  };

  // 액세스 토큰 생성
  const accessToken = generateAccessToken(payload);
  
  // 리프레시 토큰 생성 및 저장 (서버에만 저장)
  const refreshToken = generateRefreshToken(payload);
  await saveRefreshToken(user.id, refreshToken);

  return {
    user: { id: user.id, email: user.email, name: user.name },
    accessToken,
    sessionId: user.id // 세션 식별자로 사용자 ID 활용
  };
}

export async function createUserSession(accessToken: string, sessionId: string, redirectTo: string) {
  const session = await sessionStorage.getSession();
  session.set("accessToken", accessToken);
  session.set("sessionId", sessionId);
  
  return redirect(redirectTo, {
    headers: {
      "Set-Cookie": await sessionStorage.commitSession(session)
    },
  });
}

export async function authenticateUser(request: Request) {
  const session = await sessionStorage.getSession(request.headers.get("Cookie"));
  const accessToken = session.get("accessToken");
  
  if (!accessToken) return null;
  
  const payload = verifyAccessToken(accessToken);
  if (payload) {
    try {
      const user = await db.user.findUnique({
        where: { id: payload.userId },
        select: { id: true, email: true, name: true, role: true, profileImage: true },
      });
      return user;
    } catch {
      return null;
    }
  } else {
    const sessionId = session.get("sessionId");
    if (!sessionId) return null;
    
    return refreshUserSession(sessionId, session);
  }
}

async function refreshUserSession(sessionId: string, session: SessionData) {
  try {
    const latestToken = await db.refreshToken.findFirst({
      where: { userId: sessionId },
      orderBy: { createdAt: 'desc' },
      include: { user: true }
    }).catch(err => {
      console.error("Error finding refresh token:", err);
      return null;
    });
    
    if (!latestToken) {
      console.warn(`No refresh token found for session ID: ${sessionId}`);
      return null;
    }
    
    const payload = verifyRefreshToken(latestToken.token);
    if (!payload) {
      try {
        await db.refreshToken.delete({ where: { id: latestToken.id } });
      } catch (deleteError) {
        console.error("Invalid token deletion error:", deleteError);
      }
      return null;
    }
    
    const newPayload = {
      userId: latestToken.user.id,
      email: latestToken.user.email,
      role: latestToken.user.role
    };
    
    const accessToken = generateAccessToken(newPayload);
    
    session.set("accessToken", accessToken);
    
    return latestToken.user;
  } catch (error) {
    console.error("Session refresh error:", error);
    
    if (error && typeof error === 'object' && 'code' in error) {
      const prismaError = error as { code: string };
      
      if (prismaError.code === 'P1017') { // 서버 연결 닫힘
        console.warn('Database connection lost during session refresh, maintaining current session');
        return null;
      }
      
      if (prismaError.code === 'P2025') { // 레코드 찾을 수 없음
        console.warn('Refresh token not found, session may have expired');
        return null;
      }
    }
    
    return null;
  }
}

export async function logout(request: Request) {
  const session = await sessionStorage.getSession(request.headers.get("Cookie"));
  const sessionId = session.get("sessionId");
  
  if (sessionId) {
    try {
      await db.refreshToken.deleteMany({
        where: { userId: sessionId }
      });
    } catch (error) {
      console.error("Error deleting refresh tokens:", error);
    }
  }
  
  return redirect("/login", {
    headers: {
      "Set-Cookie": await sessionStorage.destroySession(session)
    },
  });
}
export async function register({ email, password, name }: RegisterForm) {
  const hashedPassword = await bcrypt.hash(password, 10);
  
  const user = await db.user.create({
    data: {
      email,
      password: hashedPassword,
      name,
    },
  });

  const payload = {
    userId: user.id,
    email: user.email,
    role: "USER"
  };

  const accessToken = generateAccessToken(payload);
  
  const refreshToken = generateRefreshToken(payload);
  await saveRefreshToken(user.id, refreshToken);

  return {
    user: { id: user.id, email: user.email, name: user.name },
    accessToken,
    sessionId: user.id
  };
}

export async function requireAuth(
  request: Request,
  redirectTo: string = new URL(request.url).pathname
) {
  const user = await authenticateUser(request);
  
  if (!user) {
    // 인증에 실패하면 로그인 페이지로
    const searchParams = new URLSearchParams([["redirectTo", redirectTo]]);
    throw redirect(`/login?${searchParams}`);
  }
  
  return user;
}

export async function getBlogUser(request: Request) {
  const user = await authenticateUser(request);
  return user; // user가 null이어도 리다이렉트하지 않음
}

// auth.server.ts에 추가 또는 수정
export async function handleGoogleLogin(code: string, redirectPath = "/") {
  // console.log('=== handleGoogleLogin 시작 ===');
  // console.log('인증 코드:', code.substring(0, 10) + '...');
  // console.log('리디렉션 경로:', redirectPath);
  
  try {
    // Google 인증 코드로 토큰 교환
    // console.log('Google 토큰 요청 시작...');
    const tokens = await getGoogleTokens(code);
    const access_token = tokens.access_token;

    if (!access_token) {
      console.error('액세스 토큰이 없습니다');
      throw new Error('Google OAuth did not return an access token.');
    }
    // console.log('액세스 토큰 획득 성공');

    // 사용자 정보 가져오기
    // console.log('사용자 정보 요청 시작...');
    const googleUser = await getGoogleUserInfo(access_token);
    // console.log('사용자 정보 획득 성공:', googleUser.email);
    
    // 이메일로 기존 사용자 확인
    // console.log('DB에서 사용자 검색 시작...');
    let user = await db.user.findUnique({
      where: { email: googleUser.email }
    });
    
    // 사용자가 없으면 새로 생성
    if (!user) {
      // console.log('새 사용자 생성 시작...');
      user = await db.user.create({
        data: {
          email: googleUser.email,
          name: googleUser.name || googleUser.email.split('@')[0],
          password: '', // 소셜 로그인은 비밀번호가 없음
          profileImage: googleUser.picture
        }
      });
      // console.log('새 사용자 생성 완료:', user.id);
    } else {
      // console.log('기존 사용자 발견:', user.id);
      // 프로필 이미지가 없거나 다른 경우 업데이트
      if (user.profileImage !== googleUser.picture && googleUser.picture) {
        // console.log('사용자 프로필 이미지 업데이트...');
        user = await db.user.update({
          where: { id: user.id },
          data: { 
            profileImage: googleUser.picture,
            // 이름이 없는 경우에만 업데이트
            name: user.name || googleUser.name || googleUser.email.split('@')[0]
          }
        });
        // console.log('사용자 프로필 업데이트 완료');
      }
    }
    
    // JWT 페이로드 생성
    // console.log('JWT 토큰 생성 시작...');
    const payload = {
      userId: user.id,
      email: user.email,
      role: user.role
    };
    
    // 액세스 토큰 생성
    const accessToken = generateAccessToken(payload);
    // console.log('액세스 토큰 생성 완료');
    
    // 리프레시 토큰 생성 및 저장
    const refreshToken = generateRefreshToken(payload);
    // console.log('리프레시 토큰 생성 완료');
    
    // console.log('DB에 리프레시 토큰 저장 시작...');
    await saveRefreshToken(user.id, refreshToken);
    // console.log('리프레시 토큰 저장 완료');
    
    // 세션 생성 및 지정된 경로로 리디렉트
    // console.log('세션 생성 및 리디렉션 처리...');
    // console.log('리디렉션 경로:', redirectPath);
    
    return createUserSession(accessToken, user.id, redirectPath);
  } catch (error) {
    console.error('=== Google 로그인 오류 ===');
    console.error('오류 타입:', error instanceof Error ? error.constructor.name : typeof error);
    console.error('오류 메시지:', error instanceof Error ? error.message : String(error));
    console.error('스택 트레이스:', error instanceof Error ? error.stack : '스택 트레이스 없음');
    throw error;
  }
}