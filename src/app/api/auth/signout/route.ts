import { NextResponse } from "next/server";

export async function GET() {
  // next-auth v4 usa /api/auth/signout (POST) normalmente.
  // Para no complicarnos, redirigimos a la página de signout oficial.
  return NextResponse.redirect(new URL("/api/auth/signout", "http://localhost:3000"));
}
