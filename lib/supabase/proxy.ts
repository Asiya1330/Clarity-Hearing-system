import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { hasEnvVars } from "../utils";
import {
  OWNER_CONSOLE_API_PREFIX,
  OWNER_CONSOLE_LOGIN_PATH,
  OWNER_CONSOLE_MFA_PATH,
  OWNER_CONSOLE_ROOT_PATH,
} from "../owner-console/constants";
import { isAal2, isConsoleEnabled } from "../owner-console/claims";

/** Redirect that preserves the just-refreshed Supabase session cookies, so the
 *  guard never inadvertently logs an authenticated user out. */
function redirectWithSession(
  url: URL,
  supabaseResponse: NextResponse,
): NextResponse {
  const res = NextResponse.redirect(url);
  for (const cookie of supabaseResponse.cookies.getAll()) {
    res.cookies.set(cookie);
  }
  return res;
}

function jsonWithSession(
  body: Record<string, unknown>,
  status: number,
  supabaseResponse: NextResponse,
): NextResponse {
  const res = NextResponse.json(body, { status });
  for (const cookie of supabaseResponse.cookies.getAll()) {
    res.cookies.set(cookie);
  }
  return res;
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  // If the env vars are not set, skip proxy check. You can remove this
  // once you setup the project.
  if (!hasEnvVars) {
    return supabaseResponse;
  }

  // With Fluid compute, don't put this client in a global environment
  // variable. Always create a new one on each request.
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Do not run code between createServerClient and
  // supabase.auth.getClaims(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.

  // IMPORTANT: If you remove getClaims() and you use server-side rendering
  // with the Supabase client, your users may be randomly logged out.
  const { data } = await supabase.auth.getClaims();
  const user = data?.claims;

  // -------------------------------------------------------------------------
  // OViz Control Room (hidden owner/staff console) gate.
  //
  // A hidden URL is NOT security; this is the real perimeter. The hidden login
  // (/auth/oviz-control-room) and MFA (/auth/oviz-control-room/mfa) pages live
  // under /auth and are intentionally NOT matched here, so they remain
  // reachable while unauthenticated. Server-side guards re-check on every page
  // and API call (defence in depth).
  // -------------------------------------------------------------------------
  const path = request.nextUrl.pathname;
  const isConsolePage =
    path === OWNER_CONSOLE_ROOT_PATH ||
    path.startsWith(`${OWNER_CONSOLE_ROOT_PATH}/`);
  const isConsoleApi = path.startsWith(OWNER_CONSOLE_API_PREFIX);

  if (isConsolePage || isConsoleApi) {
    // 1. Unauthenticated.
    if (!user) {
      if (isConsoleApi) {
        return jsonWithSession({ error: "Unauthorized." }, 401, supabaseResponse);
      }
      const url = request.nextUrl.clone();
      url.pathname = OWNER_CONSOLE_LOGIN_PATH;
      url.search = "";
      return redirectWithSession(url, supabaseResponse);
    }

    // 2. Authenticated but not console-authorized — generic, no reason leaked.
    const identity = {
      email: typeof user.email === "string" ? user.email : null,
      app_metadata:
        (user.app_metadata as Record<string, unknown> | undefined) ?? null,
    };
    if (!isConsoleEnabled(identity)) {
      if (isConsoleApi) {
        return jsonWithSession({ error: "Forbidden." }, 403, supabaseResponse);
      }
      const url = request.nextUrl.clone();
      url.pathname = "/auth/error";
      url.search = "";
      return redirectWithSession(url, supabaseResponse);
    }

    // 3. Authorized but not AAL2 — MFA is mandatory for the console.
    if (!isAal2(user as Record<string, unknown>)) {
      if (isConsoleApi) {
        return jsonWithSession(
          { error: "MFA required." },
          403,
          supabaseResponse,
        );
      }
      const url = request.nextUrl.clone();
      url.pathname = OWNER_CONSOLE_MFA_PATH;
      url.search = "";
      return redirectWithSession(url, supabaseResponse);
    }
    // Fully authorized — fall through to the normal session response.
  }

  // Authenticated users have no use for the public marketing root — send them
  // into the app. This is done here, not in app/page.tsx: with Cache Components
  // the `/` route serves its prerendered marketing shell with a 200 before the
  // page's server code runs, so a redirect() there is demoted to a client-side
  // navigation that flashes the marketing page and can mis-route the session.
  // A proxy redirect is a real 307 carrying the just-refreshed session cookies.
  if (request.nextUrl.pathname === "/" && user) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    const redirectResponse = NextResponse.redirect(url);
    for (const cookie of supabaseResponse.cookies.getAll()) {
      redirectResponse.cookies.set(cookie);
    }
    return redirectResponse;
  }

  if (
    request.nextUrl.pathname !== "/" &&
    !user &&
    !request.nextUrl.pathname.startsWith("/login") &&
    !request.nextUrl.pathname.startsWith("/auth") &&
    !request.nextUrl.pathname.startsWith("/intake") &&
    !request.nextUrl.pathname.startsWith("/api/intake")
  ) {
    // no user, potentially respond by redirecting the user to the login page
    const url = request.nextUrl.clone();
    url.pathname = "/auth/login";
    return NextResponse.redirect(url);
  }

  // IMPORTANT: You *must* return the supabaseResponse object as it is.
  // If you're creating a new response object with NextResponse.next() make sure to:
  // 1. Pass the request in it, like so:
  //    const myNewResponse = NextResponse.next({ request })
  // 2. Copy over the cookies, like so:
  //    myNewResponse.cookies.setAll(supabaseResponse.cookies.getAll())
  // 3. Change the myNewResponse object to fit your needs, but avoid changing
  //    the cookies!
  // 4. Finally:
  //    return myNewResponse
  // If this is not done, you may be causing the browser and server to go out
  // of sync and terminate the user's session prematurely!

  return supabaseResponse;
}
