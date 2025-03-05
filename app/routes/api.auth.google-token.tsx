import { ActionFunctionArgs, json } from "@remix-run/node";
import { OAuth2Client } from "google-auth-library";
import { createUserSession } from "../utils/auth.server";
import { db } from "../utils/db.server";
import { 
  generateAccessToken, 
  generateRefreshToken, 
  saveRefreshToken 
} from "../utils/jwt.server";

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

export async function action({ request }: ActionFunctionArgs) {
  const { token, redirectTo = "/" } = await request.json();

  try {
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const tokenPayload = ticket.getPayload();
    if (!tokenPayload || !tokenPayload.email) {
      return json({ success: false, error: "Invalid token" }, { status: 400 });
    }

    const { email, name, picture } = tokenPayload;

    let user = await db.user.findUnique({ where: { email: email } });
    
    if (!user) {
      user = await db.user.create({
        data: {
          email: email,
          name: name || email.split('@')[0],
          password: '',
          profileImage: picture,
        },
      });
    } else if (user.profileImage !== picture && picture) {
      user = await db.user.update({
        where: { id: user.id },
        data: { profileImage: picture }
      });
    }

    const jwtPayload = {
      userId: user.id,
      email: user.email,
      role: user.role
    };
    
    const accessToken = generateAccessToken(jwtPayload);
    const refreshToken = generateRefreshToken(jwtPayload);
    await saveRefreshToken(user.id, refreshToken);
    
    const session = await createUserSession(accessToken, user.id, redirectTo);
    
    const headers = new Headers(session.headers);
    
    return json(
      { 
        success: true, 
        user: { 
          id: user.id,
          email: user.email,
          name: user.name,
          profileImage: user.profileImage
        } 
      }, 
      { 
        headers: {
          "Set-Cookie": headers.get("Set-Cookie") || "",
        }
      }
    );
    
  } catch (error) {
    console.error("Google token verification error:", error);
    return json({ success: false, error: "Authentication failed" }, { status: 500 });
  }
}