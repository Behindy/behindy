import { PrismaClient } from "@prisma/client";

let db: PrismaClient;

declare global {
  // var 대신 let 사용
  let __db: PrismaClient | undefined;
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