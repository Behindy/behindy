import { PrismaClient } from "@prisma/client";

let db: PrismaClient;

declare global {
  // eslint-disable-next-line no-var
  var __db: PrismaClient | undefined;
}

function createPrismaClient() {
  return new PrismaClient({
    log: [
      {
        emit: 'stdout',
        level: 'error',
      },
      {
        emit: 'stdout',
        level: 'warn',
      },
    ],
  });
}

// 개발 환경에서 핫 리로딩 시 중복 연결 방지
if (process.env.NODE_ENV === "production") {
  db = createPrismaClient();
} else {
  if (!global.__db) {
    global.__db = createPrismaClient();
  }
  db = global.__db;
}

// 연결 오류 처리
try {
  // 연결 테스트 (비동기지만 초기화에만 사용하므로 await 없이 사용)
  db.$connect().catch((error) => {
    console.error('Prisma Client connection error:', error);
  });
  
  // 애플리케이션 종료 시 연결 정리
  process.on('beforeExit', () => {
    db.$disconnect().catch(console.error);
  });
} catch (error) {
  console.error('Prisma Client initialization error:', error);
  
  // 연결 재시도 로직 (필요한 경우)
  // 타입 문제를 피하기 위해 타입 체크 방식 사용
  if (error && typeof error === 'object' && 'code' in error && error.code === 'P1017') {
    console.log('Attempting to reconnect to database...');
    db = createPrismaClient();
    if (process.env.NODE_ENV !== "production") {
      global.__db = db;
    }
  }
}

export { db };