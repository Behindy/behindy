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
    await db.refreshToken.delete({ where: { id: latestToken.id } });
    return null;
  }
  
  // 새 액세스 토큰 발급
  const newPayload = {
    userId: latestToken.user.id,
    email: latestToken.user.email,
    role: latestToken.user.role
  };
  
  const accessToken = generateAccessToken(newPayload);
  
  // 리프레시 토큰 교체 (선택적 - 보안 강화)
  const newRefreshToken = generateRefreshToken(newPayload);
  await db.refreshToken.delete({ where: { id: latestToken.id } });
  await saveRefreshToken(latestToken.user.id, newRefreshToken);
  
  // 세션 업데이트
  session.set("accessToken", accessToken);
  
  // 사용자 정보 반환
  return latestToken.user;
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
export async function requireAuth(
  request: Request,
  redirectTo: string = new URL(request.url).pathname
) {
  const session = await sessionStorage.getSession(request.headers.get("Cookie"));
  const user = await authenticateUser(request);
  
  if (!user) {
    // 인증에 실패하면 로그인 페이지로
    const searchParams = new URLSearchParams([["redirectTo", redirectTo]]);
    throw redirect(`/login?${searchParams}`);
  }
  
  // 세션 갱신 필요시 쿠키 업데이트
  const newCookie = await sessionStorage.commitSession(session);
  if (newCookie !== request.headers.get("Cookie")) {
    throw redirect(redirectTo, {
      headers: {
        "Set-Cookie": newCookie
      },
    });
  }
  
  return user;
}