import jwt from 'jsonwebtoken';
import { db } from './db.server';

const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET || 'access-token-secret';
const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET || 'refresh-token-secret';

const ACCESS_TOKEN_EXPIRY = '15m';
const REFRESH_TOKEN_EXPIRY = '7d';
type TokenPayload = {
  userId: string;
  email: string;
  role: string;
};

export function generateAccessToken(payload: TokenPayload) {
  return jwt.sign(payload, ACCESS_TOKEN_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRY });
}

export function generateRefreshToken(payload: TokenPayload) {
  return jwt.sign(payload, REFRESH_TOKEN_SECRET, { expiresIn: REFRESH_TOKEN_EXPIRY });
}

export function verifyAccessToken(token: string) {
  try {
    return jwt.verify(token, ACCESS_TOKEN_SECRET) as TokenPayload & { exp: number; iat: number };
  } catch (error) {
    return null;
  }
}

export function verifyRefreshToken(token: string) {
  try {
    return jwt.verify(token, REFRESH_TOKEN_SECRET) as TokenPayload & { exp: number; iat: number };
  } catch (error) {
    return null;
  }
}

export async function saveRefreshToken(userId: string, token: string) {
  // 만료 시간 계산 (현재 시간 + 7일)
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  // 같은 사용자의 기존 토큰 삭제 (선택적)
  await db.refreshToken.deleteMany({
    where: { userId }
  });

  // 새 토큰 저장
  return db.refreshToken.create({
    data: {
      token,
      userId,
      expiresAt
    }
  });
}

export async function findRefreshToken(token: string) {
  return db.refreshToken.findUnique({
    where: { token },
    include: { user: true }
  });
}

export async function deleteRefreshToken(token: string) {
  return db.refreshToken.delete({
    where: { token }
  });
}

export async function rotateRefreshToken(oldToken: string, userId: string, payload: TokenPayload) {
  // 이전 토큰 삭제
  await deleteRefreshToken(oldToken);
  
  // 새 토큰 생성 및 저장
  const newToken = generateRefreshToken(payload);
  await saveRefreshToken(userId, newToken);
  
  return newToken;
}