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
  // 연결 테스트
  db.$connect().catch((error) => {
    console.error('Prisma Client connection error:', error);
  });
  
  // 애플리케이션 종료 시 연결 정리
  process.on('beforeExit', () => {
    db.$disconnect().catch(console.error);
  });
  
  // 재연결 기능 추가
  process.on('uncaughtException', (error) => {
    console.error('Uncaught exception:', error);
    
    // 데이터베이스 연결 오류인 경우 재연결 시도
    if (error.message.includes('Connection reset') || 
        error.message.includes('ConnectionReset') ||
        error.message.includes('104') || 
        error.message.includes('10054')) {
      // console.log('Attempting to reconnect to database...');
      db.$disconnect()
        .then(() => db.$connect())
        .catch(console.error);
    }
  });
} catch (error) {
  console.error('Prisma Client initialization error:', error);
}

export { db };