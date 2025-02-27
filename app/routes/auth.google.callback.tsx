import { LoaderFunctionArgs, json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { handleGoogleLogin } from "../utils/auth.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  
  if (!code) {
    return json({ error: "No code provided" }, { status: 400 });
  }
  
  try {
    return handleGoogleLogin(code as string);
  } catch (error) {
    console.error("Error during Google authentication:", error);
    return json({ error: "Authentication failed" }, { status: 500 });
  }
}

export default function GoogleCallback() {
  const data = useLoaderData<typeof loader>();
  
  return (
    <div className="flex justify-center items-center min-h-screen">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-4">인증 처리 중...</h1>
        <p>곧 리다이렉트됩니다.</p>
        {data.error && <p className="text-red-500 mt-4">{data.error}</p>}
      </div>
    </div>
  );
}