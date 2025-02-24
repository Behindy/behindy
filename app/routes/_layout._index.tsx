export default function Index() {
  return (
    <div className="py-12">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">Behindy</h1>
        <p className="text-xl text-gray-600 mb-8">블로그 & 채팅 포트폴리오 프로젝트</p>
        <div className="flex justify-center space-x-4">
          <a href="/blog" className="inline-block px-6 py-3 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700">
            블로그 보기
          </a>
          <a href="/chat" className="inline-block px-6 py-3 border border-gray-300 text-gray-700 font-medium rounded-md hover:bg-gray-50">
            채팅 시작하기
          </a>
        </div>
      </div>
    </div>
  );
}