import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const PUBLIC_PATHS = ['/', '/login', '/test-connection', '/_next', '/favicon.ico']

export async function middleware(request: NextRequest) {
  const { cookies, nextUrl } = request
  const isPublic = PUBLIC_PATHS.some(path => nextUrl.pathname === path || nextUrl.pathname.startsWith(path))
  if (isPublic) return NextResponse.next()

  // Check for Supabase auth cookie
  const supabaseAuthToken = cookies.get('sb-access-token') || cookies.get('supabase-auth-token')
  if (!supabaseAuthToken) {
    return NextResponse.redirect(new URL('/login', request.url))
  }
  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!api|_next|favicon.ico).*)'],
} 