import { json, redirect, ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { Form, Link, useActionData, useSearchParams } from "@remix-run/react";
import { login, createUserSession, getUser } from "../utils/session.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const user = await getUser(request);
  if (user) return redirect("/");
  return json({});
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

  const user = await login({ email, password });
  if (!user) {
    return json({ errors: { email: "Invalid credentials", password: null } }, { status: 400 });
  }

  return createUserSession(user.id, redirectTo);
}

export default function Login() {
  const actionData = useActionData<typeof action>();
  const [searchParams] = useSearchParams();
  const redirectTo = searchParams.get("redirectTo") || "/";

  return (
    <div className="flex min-h-screen flex-col justify-center bg-slate-50">
      <div className="mx-auto w-full max-w-md px-8">
        <h1 className="text-2xl font-bold text-center mb-6">로그인</h1>
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
            
            <div className="flex items-center justify-center">
              <div className="text-center text-sm text-gray-500">
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
          </Form>
        </div>
      </div>
    </div>
  );
}