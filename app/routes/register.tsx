import { json, redirect, ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { Form, Link, useActionData, useSearchParams } from "@remix-run/react";
import { register, createUserSession, authenticateUser } from "../utils/auth.server";
import { db } from "../utils/db.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const user = await authenticateUser(request);
  if (user) return redirect("/");
  return json({});
}

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  const email = formData.get("email");
  const password = formData.get("password");
  const name = formData.get("name");
  const redirectTo = formData.get("redirectTo") || "/";

  if (
    typeof email !== "string" ||
    typeof password !== "string" ||
    typeof name !== "string" ||
    typeof redirectTo !== "string"
  ) {
    return json(
      { errors: { email: "Invalid form submission", password: null, name: null } },
      { status: 400 }
    );
  }

  const errors = {
    email: email ? null : "이메일을 입력해주세요",
    password: password ? null : "비밀번호를 입력해주세요",
    name: name ? null : "이름을 입력해주세요",
  };

  const hasErrors = Object.values(errors).some(errorMessage => errorMessage);
  if (hasErrors) {
    return json({ errors }, { status: 400 });
  }

  if (password.length < 6) {
    return json(
      { errors: { email: null, password: "비밀번호는 최소 6자 이상이어야 합니다", name: null } },
      { status: 400 }
    );
  }

  const existingUser = await db.user.findUnique({ where: { email } });
  if (existingUser) {
    return json(
      { errors: { email: "이미 사용 중인 이메일입니다", password: null, name: null } },
      { status: 400 }
    );
  }

  const result = await register({ email, password, name });
  if (!result) {
    return json(
      { errors: { email: "계정 생성 중 오류가 발생했습니다", password: null, name: null } },
      { status: 500 }
    );
  }

  return createUserSession(result.accessToken, result.sessionId, redirectTo);
}

// JSX 부분은 그대로 유지
export default function Register() {
  const actionData = useActionData<typeof action>();
  const [searchParams] = useSearchParams();
  const redirectTo = searchParams.get("redirectTo") || "/";

  return (
    <div className="flex min-h-screen flex-col justify-center bg-slate-50">
      <div className="mx-auto w-full max-w-md px-8">
        <h1 className="text-2xl font-bold text-center mb-6">회원가입</h1>
        <div className="bg-white p-6 rounded-lg shadow-md">
          <Form method="post" className="space-y-6">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                이름
              </label>
              <div className="mt-1">
                <input
                  id="name"
                  name="name"
                  type="text"
                  className="w-full rounded border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  aria-invalid={actionData?.errors?.name ? true : undefined}
                  aria-errormessage={actionData?.errors?.name ? "name-error" : undefined}
                />
                {actionData?.errors?.name && (
                  <div className="pt-1 text-red-700" id="name-error">
                    {actionData.errors.name}
                  </div>
                )}
              </div>
            </div>
            
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
                  autoComplete="new-password"
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
              회원가입
            </button>
            
            <div className="flex items-center justify-center">
              <div className="text-center text-sm text-gray-500">
                이미 계정이 있으신가요?{" "}
                <Link
                  to={{
                    pathname: "/login",
                    search: searchParams.toString(),
                  }}
                  className="text-blue-500 underline"
                >
                  로그인
                </Link>
              </div>
            </div>
          </Form>
        </div>
      </div>
    </div>
  );
}