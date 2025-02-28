import { json, LoaderFunctionArgs, redirect } from "@remix-run/node";
import { authenticateUser } from "../utils/auth.server";

export async function loader({ request }: LoaderFunctionArgs) {
  // 루트 경로에 접근하면 /blog로 리다이렉트
  return redirect("/blog");
  
  // 아래 코드는 실행되지 않음 (리다이렉트 후)
  const user = await authenticateUser(request);
  return json({ user });
}

export default function Index() {
  return null;
}