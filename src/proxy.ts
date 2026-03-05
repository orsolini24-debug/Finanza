import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const pathname = req.nextUrl.pathname;

    // Utente autenticato ma non ancora onboardato → redirect a onboarding
    // (eccetto se è già sull'onboarding)
    if (token && !token.isOnboarded && pathname !== '/app/onboarding') {
      return NextResponse.redirect(new URL('/app/onboarding', req.url));
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  }
);

export const config = {
  matcher: ["/app/:path*"],
};
