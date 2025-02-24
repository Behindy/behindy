import { json, LoaderFunctionArgs } from "@remix-run/node";
import { Form, Link, NavLink, Outlet, useLoaderData } from "@remix-run/react";
import { getUser } from "~/utils/session.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const user = await getUser(request);
  return json({ user });
}

export default function Layout() {
  const { user } = useLoaderData<typeof loader>();

  return (
    <div className="flex flex-col min-h-screen">
      <header className="bg-slate-800 text-white">
        <div className="container mx-auto py-4 px-6">
          <div className="flex items-center justify-between">
            <Link to="/" className="text-xl font-bold">Behindy</Link>
            
            <nav className="flex items-center space-x-6">
              <NavLink 
                to="/blog" 
                className={({ isActive }) => 
                  isActive ? "text-blue-300 font-medium" : "hover:text-blue-300"
                }
              >
                블로그
              </NavLink>
              
              <NavLink 
                to="/chat" 
                className={({ isActive }) => 
                  isActive ? "text-blue-300 font-medium" : "hover:text-blue-300"
                }
              >
                채팅
              </NavLink>
              
              {user ? (
                <div className="flex items-center space-x-4">
                  <span className="text-sm">
                    <span className="opacity-75">안녕하세요,</span> {user.name}님
                  </span>
                  <Form action="/logout" method="post">
                    <button 
                      type="submit" 
                      className="bg-red-600 hover:bg-red-700 px-3 py-1 rounded text-sm"
                    >
                      로그아웃
                    </button>
                  </Form>
                </div>
              ) : (
                <Link 
                  to="/login" 
                  className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded text-sm"
                >
                  로그인
                </Link>
              )}
            </nav>
          </div>
        </div>
      </header>
      
      <main className="flex-grow container mx-auto py-6 px-4">
        <Outlet />
      </main>
      
      <footer className="bg-slate-800 text-white py-6">
        <div className="container mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="mb-4 md:mb-0">
              <p className="text-sm opacity-75">
                &copy; {new Date().getFullYear()} Behindy. All Rights Reserved.
              </p>
            </div>
            
            <div className="flex space-x-4">
              <a href="#" className="text-sm opacity-75 hover:opacity-100">
                이용약관
              </a>
              <a href="#" className="text-sm opacity-75 hover:opacity-100">
                개인정보처리방침
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}