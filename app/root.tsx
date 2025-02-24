import { json, LinksFunction, LoaderFunctionArgs } from "@remix-run/node";
import {
  Links,
  LiveReload,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  // useLoaderData 제거 - 사용하지 않으므로
} from "@remix-run/react";
import styles from "./styles/tailwind.css";
import { getUser } from "./utils/session.server"; // 경로 수정

export const links: LinksFunction = () => [
  { rel: "stylesheet", href: styles },
];

export async function loader({ request }: LoaderFunctionArgs) {
  return json({
    user: await getUser(request),
  });
}

export default function App() {
  // 사용하지 않는 변수는 제거
  // const { user } = useLoaderData<typeof loader>();

  return (
    <html lang="ko" className="h-full">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body className="h-full">
        <Outlet />
        <ScrollRestoration />
        <Scripts />
        <LiveReload />
      </body>
    </html>
  );
}