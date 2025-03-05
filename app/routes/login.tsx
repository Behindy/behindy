import { json, redirect, ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { Form, Link, useActionData, useSearchParams, useLoaderData } from "@remix-run/react";
import { login, createUserSession, authenticateUser } from "../utils/auth.server";
import { useEffect, useRef } from "react";

export async function loader({ request }: LoaderFunctionArgs) {
  const user = await authenticateUser(request);
  if (user) return redirect("/");
  
  return json({
    googleClientId: process.env.GOOGLE_CLIENT_ID
  });
}

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  const email = formData.get("email");
  const password = formData.get("password");
  const redirectTo = formData.get("redirectTo") || "/";

  if (
    typeof email !== "string" ||
    typeof password !== "string" ||
    typeof redirectTo !== "string"
  ) {
    return json({ errors: { email: "Invalid email", password: "Invalid password" } }, { status: 400 });
  }

  if (!email) {
    return json({ errors: { email: "Email is required", password: null } }, { status: 400 });
  }

  if (!password) {
    return json({ errors: { email: null, password: "Password is required" } }, { status: 400 });
  }

  const result = await login({ email, password });
  if (!result) {
    return json({ errors: { email: "Invalid credentials", password: null } }, { status: 400 });
  }

  return createUserSession(result.accessToken, result.sessionId, redirectTo);
}

export default function Login() {
  const { googleClientId } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const [searchParams] = useSearchParams();
  const redirectTo = searchParams.get("redirectTo") || "/";
  const googleSigninButtonRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    const handleCredentialResponse = (response: {credential: string}) => {
      fetch("/api/auth/google-token", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ token: response.credential }),
      })
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            window.location.href = "/";
          }
        })
        .catch(err => {
          console.error("Login failed:", err);
        });
    };
    
    const checkGoogleLoaded = () => {
      if (typeof window !== "undefined" && window.google && googleSigninButtonRef.current && googleClientId) {
        window.google.accounts.id.initialize({
          client_id: googleClientId,
          callback: handleCredentialResponse,
          auto_select: false,
          ux_mode: "popup",
        });
        
        window.google.accounts.id.renderButton(
          googleSigninButtonRef.current,
          { theme: "outline", size: "large", width: 240 }
        );
      } else {
        setTimeout(checkGoogleLoaded, 100);
      }
    };
    
    checkGoogleLoaded();
  }, [googleClientId]);

  return (
    <div className="flex min-h-screen flex-col justify-center bg-slate-50">
      <div className="mx-auto w-full max-w-md px-8">
        <div className="mx-auto my-3 w-1/2 text-center">
          <Link to="/blog" className="text-4xl font-bold text-blue-700 mb-6">Behindy</Link>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-md">
          <Form method="post" className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                이메일
              </label>
              <div className="mt-1">
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  className="w-full rounded border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  aria-invalid={actionData?.errors?.email ? true : undefined}
                  aria-errormessage={actionData?.errors?.email ? "email-error" : undefined}
                />
                {actionData?.errors?.email && (
                  <div className="pt-1 text-red-700" id="email-error">
                    {actionData.errors.email}
                  </div>
                )}
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                비밀번호
              </label>
              <div className="mt-1">
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  className="w-full rounded border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  aria-invalid={actionData?.errors?.password ? true : undefined}
                  aria-errormessage={actionData?.errors?.password ? "password-error" : undefined}
                />
                {actionData?.errors?.password && (
                  <div className="pt-1 text-red-700" id="password-error">
                    {actionData.errors.password}
                  </div>
                )}
              </div>
            </div>

            <input type="hidden" name="redirectTo" value={redirectTo} />
            
            <button
              type="submit"
              className="w-full rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600 focus:bg-blue-400"
            >
              로그인
            </button>
          </Form>
          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">또는</span>
              </div>
            </div>

            <div className="mt-6 flex justify-center">
              <div ref={googleSigninButtonRef} id="google-signin-button"></div>
            </div>
          </div>

          <div className="mt-6 text-center text-sm text-gray-500">
            계정이 없으신가요?{" "}
            <Link
              to={{
                pathname: "/register",
                search: searchParams.toString(),
              }}
              className="text-blue-500 underline"
            >
              회원가입
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}