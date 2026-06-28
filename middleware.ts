import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { isAuthenticatedEdge, redirectToLogin } from "@/lib/auth-edge";

export async function middleware(req: NextRequest) {
  if (req.nextUrl.pathname.startsWith("/dashboard") && !(await isAuthenticatedEdge(req))) {
    return redirectToLogin(req);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*"]
};
