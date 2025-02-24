import { PrismaClient } from "@prisma/client";

let db: PrismaClient;

// TypeScript에게 global 타입을 확장
declare global {
  // eslint-disable-next-line no-var
  var __db: PrismaClient | undefined;
}

// 개발 환경에서 핫 리로딩 시 중복 연결 방지
if (process.env.NODE_ENV === "production") {
  db = new PrismaClient();
} else {
  if (!global.__db) {
    global.__db = new PrismaClient();
  }
  db = global.__db;
}

export { db };