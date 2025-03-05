// app/root.tsx 수정 (기존 코드에 추가)
import { json, LoaderFunctionArgs } from "@remix-run/node";
import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from "@remix-run/react";
import { authenticateUser } from "./utils/auth.server";
import { BlogProvider } from "./context/BlogContext";
import "./styles/tailwind.css";

declare global {
  interface Window {
    google: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: {credential: string}) => void;
            auto_select?: boolean;
            ux_mode?: "popup" | "redirect";
            login_uri?: string;
          }) => void;
          renderButton: (
            element: HTMLElement | null,
            options: {
              theme?: "outline" | "filled_blue" | "filled_black";
              size?: "large" | "medium" | "small";
              width?: number;
            }
          ) => void;
        };
      };
    };
  }
}

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
        <script src="https://accounts.google.com/gsi/client" async defer></script>
      </head>
      <body className="h-full">
        <BlogProvider>
          <Outlet />
        </BlogProvider>
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}