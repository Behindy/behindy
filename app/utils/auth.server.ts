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


// 파일 상단에 타입 정의 추가
type LoginForm = {
  email: string;
  password: string;
};

type RegisterForm = LoginForm & {
  name: string;
};

// 세션 스토리지 설정
export const sessionStorage = createCookieSessionStorage({
  cookie: {
    name: "behindy",
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    secrets: ["s3cr3t"], // 실제 배포 시 환경 변수로 관리
    secure: process.env.NODE_ENV === "production",
  },
});

// 로그인 처리
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

// 사용자 세션 생성 (액세스 토큰과 세션 ID만 쿠키에 저장)
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

// 토큰에서 사용자 인증 정보 가져오기
export async function authenticateUser(request: Request) {
  const session = await sessionStorage.getSession(request.headers.get("Cookie"));
  const accessToken = session.get("accessToken");
  
  if (!accessToken) return null;
  
  const payload = verifyAccessToken(accessToken);
  if (payload) {
    // 액세스 토큰이 유효하면 바로 사용자 정보 반환
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
    // 액세스 토큰이 만료되었으면 세션 ID로 리프레시 토큰 찾아 갱신 시도
    const sessionId = session.get("sessionId");
    if (!sessionId) return null;
    
    return refreshUserSession(sessionId, session);
  }
}

// 세션 ID를 사용해 리프레시 토큰 찾아 액세스 토큰 갱신
async function refreshUserSession(sessionId: string, session: SessionData) {
  try {
    // 사용자 ID로 가장 최근의 리프레시 토큰 찾기
    const latestToken = await db.refreshToken.findFirst({
      where: { userId: sessionId },
      orderBy: { createdAt: 'desc' },
      include: { user: true }
    });
    
    if (!latestToken) return null;
    
    // 리프레시 토큰 검증
    const payload = verifyRefreshToken(latestToken.token);
    if (!payload) {
      // 토큰이 유효하지 않으면 삭제
      try {
        await db.refreshToken.delete({ where: { id: latestToken.id } });
      } catch (error) {
        console.error("Invalid token deletion error:", error);
        // 오류가 발생해도 계속 진행
      }
      return null;
    }
    
    // 새 액세스 토큰 발급
    const newPayload = {
      userId: latestToken.user.id,
      email: latestToken.user.email,
      role: latestToken.user.role
    };
    
    const accessToken = generateAccessToken(newPayload);
    
    // 세션 업데이트
    session.set("accessToken", accessToken);
    
    // 중요: 기존 리프레시 토큰 교체는 생략
    // 이미 존재하는 토큰을 계속 사용
    
    // 사용자 정보 반환
    return latestToken.user;
  } catch (error) {
    console.error("Session refresh error:", error);
    return null;
  }
}
// 로그아웃 처리
export async function logout(request: Request) {
  const session = await sessionStorage.getSession(request.headers.get("Cookie"));
  const sessionId = session.get("sessionId");
  
  // 세션 ID가 있으면 해당 사용자의 모든 리프레시 토큰 삭제
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
// auth.server.ts에 추가
export async function register({ email, password, name }: RegisterForm) {
  const hashedPassword = await bcrypt.hash(password, 10);
  
  const user = await db.user.create({
    data: {
      email,
      password: hashedPassword,
      name,
    },
  });

  // JWT 페이로드 생성
  const payload = {
    userId: user.id,
    email: user.email,
    role: "USER"
  };

  // 액세스 토큰 생성
  const accessToken = generateAccessToken(payload);
  
  // 리프레시 토큰 생성 및 저장 (서버에만 저장)
  const refreshToken = generateRefreshToken(payload);
  await saveRefreshToken(user.id, refreshToken);

  return {
    user: { id: user.id, email: user.email, name: user.name },
    accessToken,
    sessionId: user.id
  };
}

// 인증 필요한 페이지에 대한 보호
// 기존 requireAuth 유지 (글 작성, 편집 등에 사용)
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

// 추가: 블로그 접근용 함수 (로그인 필요 없음)
export async function getBlogUser(request: Request) {
  const user = await authenticateUser(request);
  return user; // user가 null이어도 리다이렉트하지 않음
}


// Google 로그인 처리
export async function handleGoogleLogin(code: string) {
  try {
    // Google 인증 코드로 토큰 교환
    const tokens = await getGoogleTokens(code);
    const access_token = tokens.access_token;

    // access_token이 undefined인 경우 예외 처리
    if (!access_token) {
      throw new Error('Google OAuth did not return an access token.');
    }

    // 액세스 토큰으로 사용자 정보 가져오기
    const googleUser = await getGoogleUserInfo(access_token);
    
    // 이메일로 기존 사용자 확인
    let user = await db.user.findUnique({
      where: { email: googleUser.email }
    });
    
    // 사용자가 없으면 새로 생성
    if (!user) {
      user = await db.user.create({
        data: {
          email: googleUser.email,
          name: googleUser.name,
          password: '', // 소셜 로그인은 비밀번호가 없음
          profileImage: googleUser.picture
        }
      });
    }
    
    // JWT 페이로드 생성
    const payload = {
      userId: user.id,
      email: user.email,
      role: user.role
    };
    
    // 액세스 토큰 생성
    const accessToken = generateAccessToken(payload);
    
    // 리프레시 토큰 생성 및 저장
    const refreshToken = generateRefreshToken(payload);
    await saveRefreshToken(user.id, refreshToken);
    
    // 세션 생성
    return createUserSession(accessToken, refreshToken, '/');
  } catch (error) {
    console.error('Google login error:', error);
    throw error;
  }
}
