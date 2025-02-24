import { createCookieSessionStorage, redirect } from "@remix-run/node";
import { db } from "./db.server";
import bcrypt from "bcryptjs";

type LoginForm = {
  email: string;
  password: string;
};

type RegisterForm = LoginForm & {
  name: string;
};

// 세션 관리를 위한 쿠키 설정
export const sessionStorage = createCookieSessionStorage({
  cookie: {
    name: "__session",
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    secrets: ["s3cr3t"], // 실제 배포 시 환경 변수로 관리
    secure: process.env.NODE_ENV === "production",
  },
});

// 사용자 세션 가져오기
export async function getUserSession(request: Request) {
  return sessionStorage.getSession(request.headers.get("Cookie"));
}

// 현재 로그인된 사용자 ID 가져오기
export async function getUserId(request: Request) {
  const session = await getUserSession(request);
  const userId = session.get("userId");
  if (!userId || typeof userId !== "string") return null;
  return userId;
}

// 현재 로그인된 사용자 정보 가져오기
export async function getUser(request: Request) {
  const userId = await getUserId(request);
  if (typeof userId !== "string") {
    return null;
  }

  try {
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true, role: true, profileImage: true }, // 비밀번호 제외
    });
    return user;
  } catch {
    throw logout(request);
  }
}

// 로그인 처리
export async function login({ email, password }: LoginForm) {
  const user = await db.user.findUnique({
    where: { email },
  });
  if (!user) return null;

  const isCorrectPassword = await bcrypt.compare(password, user.password);
  if (!isCorrectPassword) return null;

  return { id: user.id, email: user.email, name: user.name };
}

// 세션 생성 및 로그인 리다이렉트
export async function createUserSession(userId: string, redirectTo: string) {
  const session = await sessionStorage.getSession();
  session.set("userId", userId);
  return redirect(redirectTo, {
    headers: {
      "Set-Cookie": await sessionStorage.commitSession(session),
    },
  });
}

// 로그아웃 처리
export async function logout(request: Request) {
  const session = await getUserSession(request);
  return redirect("/login", {
    headers: {
      "Set-Cookie": await sessionStorage.destroySession(session),
    },
  });
}

// 회원가입 처리
export async function register({ email, password, name }: RegisterForm) {
  const hashedPassword = await bcrypt.hash(password, 10);
  
  const user = await db.user.create({
    data: {
      email,
      password: hashedPassword,
      name,
    },
  });

  return { id: user.id, email: user.email, name: user.name };
}

// 인증 필요한 페이지에 대한 보호
export async function requireUserId(
  request: Request,
  redirectTo: string = new URL(request.url).pathname
) {
  const session = await getUserSession(request);
  const userId = session.get("userId");
  if (!userId || typeof userId !== "string") {
    const searchParams = new URLSearchParams([["redirectTo", redirectTo]]);
    throw redirect(`/login?${searchParams}`);
  }
  return userId;
}

// 관리자 권한 확인
export async function requireAdmin(request: Request) {
  const userId = await requireUserId(request);
  
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });
  
  if (user?.role !== "ADMIN") {
    throw redirect("/unauthorized");
  }
  
  return userId;
}