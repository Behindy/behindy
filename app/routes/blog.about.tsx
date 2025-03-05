import { json, LoaderFunctionArgs } from "@remix-run/node";
import { Link } from "@remix-run/react";
import { authenticateUser } from "../utils/auth.server";



export async function loader({ request }: LoaderFunctionArgs) {
  const user = await authenticateUser(request);
  return json({ user });
}

export default function BlogAbout() {
  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold text-center mb-8">Behindy 소개</h1>
      
      <section className="mb-12">
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-2xl font-semibold mb-4">📝 블로그 소개</h2>
          <p className="text-gray-700 mb-4">
            Behindy는 개발자들을 위한 블로그 플랫폼입니다. 다양한 개발 경험과 지식을 공유하고, 
            기술적인 문제 해결 방법을 함께 고민하는 공간입니다. 마크다운 형식으로 글을 작성하고,
            관리할 수 있습니다.
          </p>
        </div>
      </section>
      
      <section className="mb-12">
        <h2 className="text-2xl font-semibold mb-6">✨ 주요 기능</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-xl font-medium text-blue-700 mb-3">마크다운</h3>
            <p className="text-gray-700">
              GitHub 스타일의 마크다운을 지원하여 코드 블록, 목록, 표 등을 쉽게 작성할 수 있습니다.
              실시간 미리보기로 작성 중인 글의 모습을 바로 확인할 수 있습니다.
            </p>
          </div>
          
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-xl font-medium text-blue-700 mb-3">태그</h3>
            <p className="text-gray-700">
              글에 태그를 추가하여 주제별로 분류하고 검색할 수 있습니다.
              관심 있는 주제의 글을 쉽게 찾아볼 수 있습니다.
            </p>
          </div>
          
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-xl font-medium text-blue-700 mb-3">반응형 디자인</h3>
            <p className="text-gray-700">
              모바일, 태블릿, 데스크톱 등 다양한 기기에서 최적화된 경험을 제공합니다.
              언제 어디서나 편리하게 블로그를 이용할 수 있습니다.
            </p>
          </div>
          
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-xl font-medium text-blue-700 mb-3">댓글 시스템</h3>
            <p className="text-gray-700">
              글에 대한 의견을 나누고 질문할 수 있는 댓글 시스템을 제공합니다.
              다른 사용자와 소통하며 더 깊이 있는 논의가 가능합니다.
            </p>
          </div>
        </div>
      </section>
      
      <section className="mb-12">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-2xl font-semibold mb-4">🛠️ 기술 스택</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-xl font-medium text-gray-800 mb-3">프론트엔드</h3>
              <ul className="list-disc pl-5 space-y-2 text-gray-700">
                <li>React.js - UI 구성 및 상태 관리</li>
                <li>Remix - 서버 사이드 렌더링 및 라우팅</li>
                <li>Tailwind CSS - 스타일링</li>
                <li>Marked.js - 마크다운 렌더링</li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-xl font-medium text-gray-800 mb-3">백엔드</h3>
              <ul className="list-disc pl-5 space-y-2 text-gray-700">
                <li>Node.js - 서버 런타임</li>
                <li>Prisma/PostgreSQL - ORM/데이터베이스</li>
                <li>AWS S3 - 이미지 스토리지</li>
                <li>JWT - 인증 및 보안</li>
              </ul>
            </div>
          </div>
        </div>
      </section>
      
      <section className="mb-12">
        <div className="bg-blue-50 rounded-lg shadow-md p-6 text-center">
          <h2 className="text-2xl font-semibold mb-4">🚀 이 페이지를 제작하는 열흘간의 기록록</h2>
          <p className="text-gray-700 mb-6">
          </p>
          
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Link
              to="/blog"
              className="px-6 py-3 bg-gray-200 text-gray-800 rounded-md font-medium hover:bg-gray-300 transition"
            >
              준비중...!
            </Link>
          </div>
        </div>
      </section>
      
      <section className="mb-12">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-2xl font-semibold mb-4">📬 연락처 및 피드백</h2>
          <p className="text-gray-700 mb-4">
            Behindy 블로그에 대한 피드백이 있으시면 언제든지 연락주세요.
          </p>
          
          <ul className="space-y-2 text-gray-700">
            <li>
              <span className="font-medium">이메일:</span> solme47@gmail.com
            </li>
            <li>
              <span className="font-medium">프로젝트 Github</span> 
              <a href="https://github.com/behindy/blog" className="text-blue-600 hover:underline ml-1" target="_blank" rel="noopener noreferrer">
                https://github.com/Behindy
              </a>
            </li>
            <li>
              <span className="font-medium">Github</span> 
              <a href="https://github.com/behindy3359" className="text-blue-600 hover:underline ml-1" target="_blank" rel="noopener noreferrer">
                https://github.com/behindy3359
              </a>
            </li>
            
            <li>
              <span className="font-medium">Velog:</span> <a href="https://velog.io/@behindy0311/posts"className="text-blue-600 hover:underline ml-1" target="_blank" rel="noopener noreferrer"> https://velog.io/@behindy0311/posts</a>
            </li>
          </ul>
        </div>
      </section>
    </div>
  );
}