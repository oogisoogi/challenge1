import type { Hono } from 'hono';
import {
  failure,
  respond,
} from '@/backend/http/response';
import {
  getSupabase,
  type AppEnv,
} from '@/backend/hono/context';
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
};
