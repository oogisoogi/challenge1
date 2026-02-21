import type { Hono } from 'hono';
import {
  failure,
  respond,
  success,
} from '@/backend/http/response';
import {
  getSupabase,
  type AppEnv,
} from '@/backend/hono/context';
import { extractUserId } from '@/backend/http/auth';
import { signupRequestSchema } from './schema';
import { signUpUser } from './service';
import { authErrorCodes } from './error';

export const registerAuthRoutes = (app: Hono<AppEnv>) => {
  app.post('/api/auth/signup', async (c) => {
    const body = await c.req.json();
    const parsed = signupRequestSchema.safeParse(body);

    if (!parsed.success) {
      return respond(
        c,
        failure(
          400,
          authErrorCodes.onboardingValidation,
          '입력값이 올바르지 않습니다.',
          parsed.error.format(),
        ),
      );
    }

    const supabase = getSupabase(c);
    const result = await signUpUser(supabase, {
      email: parsed.data.email,
      password: parsed.data.password,
      role: parsed.data.role,
      name: parsed.data.name,
      phone: parsed.data.phone,
      bio: parsed.data.bio,
    });

    return respond(c, result);
  });

  app.get('/api/auth/me/profile', async (c) => {
    const userId = await extractUserId(c);

    if (!userId) {
      return respond(
        c,
        failure(401, authErrorCodes.unauthorized, '인증이 필요합니다.'),
      );
    }

    const supabase = getSupabase(c);
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, role, name, phone, bio, is_restricted')
      .eq('id', userId)
      .maybeSingle();

    if (!profile) {
      return respond(
        c,
        failure(404, 'PROFILE_NOT_FOUND', '프로필을 찾을 수 없습니다.'),
      );
    }

    return respond(
      c,
      success({
        id: profile.id,
        role: profile.role,
        name: profile.name,
        phone: profile.phone,
        bio: profile.bio,
        isRestricted: profile.is_restricted,
      }),
    );
  });
};
