import { json, LoaderFunctionArgs } from "@remix-run/node";
import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from "@remix-run/react";
import { authenticateUser } from "./utils/auth.server";

// CSS 직접 임포트
import "./styles/tailwind.css";

export async function loader({ request }: LoaderFunctionArgs) {
  return json({
    user: await authenticateUser(request),
  });
}

export default function App() {
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
      </body>
    </html>
  );
}