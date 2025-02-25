import { json, LoaderFunctionArgs } from "@remix-run/node";
import { Link } from "@remix-run/react";
import { authenticateUser } from "../utils/auth.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const user = await authenticateUser(request);
  return json({ user });
}

// 푸터 컴포넌트는 그대로 유지
<footer className="bg-slate-800 text-white py-6">
  <div className="container mx-auto px-6">
    <div className="flex flex-col md:flex-row justify-between items-center">
      <div className="mb-4 md:mb-0">
        <p className="text-sm opacity-75">
          &copy; {new Date().getFullYear()} Behindy. All Rights Reserved.
        </p>
      </div>
      
      <div className="flex space-x-4">
        <Link to="/terms" className="text-sm opacity-75 hover:opacity-100">
          이용약관
        </Link>
        <Link to="/privacy" className="text-sm opacity-75 hover:opacity-100">
          개인정보처리방침
        </Link>
      </div>
    </div>
  </div>
</footer>