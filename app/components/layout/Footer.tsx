export default function Footer() {
  return (
    <footer className="bg-gray-800 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="md:flex md:justify-between">
          <div className="mb-6 md:mb-0">
            <h2 className="text-lg font-bold">Behindy</h2>
            <p className="mt-2 text-sm text-gray-300">깃허브</p>
            <p className="mt-2 text-sm text-gray-300">블로그</p>
          </div>
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-3">
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wider">메뉴</h3>
              <ul className="mt-4 space-y-2">
                <li><a href="/blog" className="text-sm text-gray-300 hover:text-white">블로그</a></li>
                <li><a href="/chat" className="text-sm text-gray-300 hover:text-white">채팅</a></li>
                <li><a href="/dashboard" className="text-sm text-gray-300 hover:text-white">대시보드</a></li>
              </ul>
            </div>
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wider">기술 스택</h3>
              <ul className="mt-4 space-y-2">
                <li><span className="text-sm text-gray-300">Remix</span></li>
                <li><span className="text-sm text-gray-300">PostgreSQL</span></li>
                <li><span className="text-sm text-gray-300">Tailwind CSS</span></li>
              </ul>
            </div>
          </div>
        </div>
        <div className="mt-8 border-t border-gray-700 pt-8 md:flex md:items-center md:justify-between">
          <p className="text-sm text-gray-300">&copy; {new Date().getFullYear()} Behindy. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}