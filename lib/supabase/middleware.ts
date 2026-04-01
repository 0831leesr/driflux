import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            request.cookies.set(name, value),
          )
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          )
        },
      },
    },
  )

  // 중요: createServerClient와 getUser() 사이에는 다른 로직을 넣지 마세요.
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // [선택적 라우트 보호 예시]
  // 로그인이 필요한 특정 페이지(예: /mypage)에 접근하려는데 user가 없다면 로그인 페이지로 튕겨냅니다.
  /*
  if (!user && request.nextUrl.pathname.startsWith('/mypage')) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }
  */

  return supabaseResponse
}
