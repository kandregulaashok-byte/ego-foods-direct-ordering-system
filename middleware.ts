import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { isAuthenticated, redirectToLogin } from "@/lib/auth";

export function middleware(req: NextRequest) {
  if (req.nextUrl.pathname.startsWith("/dashboard") && !isAuthenticated(req)) {
    return redirectToLogin(req);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*"]
};
