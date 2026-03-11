import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    // Il middleware ora si limita a garantire che l'utente sia loggato
    // Non facciamo più redirect automatici basati su isOnboarded per evitare loop infiniti
    // causati da JWT non sincronizzati istantaneamente.
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
