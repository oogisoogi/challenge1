import type { Hono } from 'hono';
import {
  failure,
  respond,
} from '@/backend/http/response';
import {
  getLogger,
  getSupabase,
  type AppEnv,
} from '@/backend/hono/context';
import { signupRequestSchema, onboardingRequestSchema } from './schema';
import { signUpUser, completeOnboarding } from './service';
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
    const { email, password } = parsed.data;
    const result = await signUpUser(supabase, { email, password });

    return respond(c, result);
  });

  app.post('/api/auth/onboarding', async (c) => {
    const supabase = getSupabase(c);
    const logger = getLogger(c);

    const authHeader = c.req.header('Authorization');
    let userId: string | null = null;

    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.slice(7);
      const { data: { user }, error } = await supabase.auth.getUser(token);

      if (error || !user) {
        logger.warn('Onboarding auth failed via Bearer token');
      } else {
        userId = user.id;
      }
    }

    if (!userId) {
      const { data: { user }, error } = await supabase.auth.getUser();

      if (error || !user) {
        return respond(
          c,
          failure(401, authErrorCodes.unauthorized, '인증이 필요합니다.'),
        );
      }

      userId = user.id;
    }

    const body = await c.req.json();
    const parsed = onboardingRequestSchema.safeParse(body);

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

    const result = await completeOnboarding(supabase, {
      userId,
      role: parsed.data.role,
      name: parsed.data.name,
      phone: parsed.data.phone,
      bio: parsed.data.bio,
    });

    return respond(c, result);
  });
};
