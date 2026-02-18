import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import type { Database } from "@/lib/supabase/types";
import { env } from "@/constants/env";
import {
  LOGIN_PATH,
  ONBOARDING_PATH,
  shouldProtectPath,
} from "@/constants/auth";
import { match } from "ts-pattern";

type ProfileRow = { id: string; role: string };

const ROLE_REDIRECT_MAP: Record<string, string> = {
  learner: "/courses",
  instructor: "/instructor/dashboard",
};

const copyCookies = (from: NextResponse, to: NextResponse) => {
  from.cookies.getAll().forEach((cookie) => {
    to.cookies.set({
      name: cookie.name,
      value: cookie.value,
      path: cookie.path,
      expires: cookie.expires,
      httpOnly: cookie.httpOnly,
      maxAge: cookie.maxAge,
      sameSite: cookie.sameSite,
      secure: cookie.secure,
    });
  });

  return to;
};

export async function middleware(request: NextRequest) {
  const response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set({ name, value, ...options });
            response.cookies.set({ name, value, ...options });
          });
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  const decision = match({ user, pathname })
    .when(
      ({ user: currentUser, pathname: path }) =>
        !currentUser && shouldProtectPath(path),
      ({ pathname: path }) => {
        const loginUrl = request.nextUrl.clone();
        loginUrl.pathname = LOGIN_PATH;
        loginUrl.searchParams.set("redirectedFrom", path);

        return copyCookies(response, NextResponse.redirect(loginUrl));
      }
    )
    .when(
      ({ user: currentUser, pathname: path }) =>
        !!currentUser && shouldProtectPath(path) && path !== ONBOARDING_PATH,
      async ({ user: currentUser }) => {
        const { data: profile } = await supabase
          .from("profiles")
          .select("id, role")
          .eq("id", currentUser!.id)
          .maybeSingle<ProfileRow>();

        if (!profile) {
          const onboardingUrl = request.nextUrl.clone();
          onboardingUrl.pathname = ONBOARDING_PATH;
          return copyCookies(response, NextResponse.redirect(onboardingUrl));
        }

        return response;
      }
    )
    .when(
      ({ user: currentUser, pathname: path }) =>
        !!currentUser && path === ONBOARDING_PATH,
      async ({ user: currentUser }) => {
        const { data: profile } = await supabase
          .from("profiles")
          .select("id, role")
          .eq("id", currentUser!.id)
          .maybeSingle<ProfileRow>();

        if (profile) {
          const role = profile.role as string;
          const redirectTo = ROLE_REDIRECT_MAP[role] ?? "/";
          const redirectUrl = request.nextUrl.clone();
          redirectUrl.pathname = redirectTo;
          return copyCookies(response, NextResponse.redirect(redirectUrl));
        }

        return response;
      }
    )
    .otherwise(() => response);

  return decision;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
