import { LoaderFunctionArgs, redirect } from "@remix-run/node";
import { getGoogleAuthURL } from "../utils/google.server";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function loader({ request }: LoaderFunctionArgs) {
  const googleAuthURL = getGoogleAuthURL();
  return redirect(googleAuthURL);
}