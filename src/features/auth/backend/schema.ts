import { z } from 'zod';

const PASSWORD_MIN_LENGTH = 6;
const PHONE_REGEX = /^01[016789]-?\d{3,4}-?\d{4}$/;

export const signupRequestSchema = z.object({
  email: z.string().email({ message: '유효한 이메일을 입력해주세요.' }),
  password: z
    .string()
    .min(PASSWORD_MIN_LENGTH, {
      message: `비밀번호는 ${PASSWORD_MIN_LENGTH}자 이상이어야 합니다.`,
    }),
  role: z.enum(['learner', 'instructor'], {
    errorMap: () => ({ message: '역할은 learner 또는 instructor만 선택 가능합니다.' }),
  }),
  name: z.string().min(1, { message: '이름을 입력해주세요.' }),
  phone: z.string().regex(PHONE_REGEX, {
    message: '유효한 전화번호를 입력해주세요.',
  }),
  bio: z.string().default(''),
  termsAgreed: z.literal(true, {
    errorMap: () => ({ message: '약관에 동의해야 합니다.' }),
  }),
});

export type SignupRequest = z.infer<typeof signupRequestSchema>;

export const signupResponseSchema = z.object({
  uid: z.string().uuid(),
  redirectTo: z.string(),
});

export type SignupResponse = z.infer<typeof signupResponseSchema>;

export const profileRowSchema = z.object({
  id: z.string().uuid(),
  role: z.enum(['learner', 'instructor', 'operator']),
  name: z.string(),
  phone: z.string(),
  bio: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
});

export type ProfileRow = z.infer<typeof profileRowSchema>;

export const myProfileResponseSchema = z.object({
  id: z.string().uuid(),
  role: z.enum(['learner', 'instructor', 'operator']),
  name: z.string(),
  phone: z.string(),
  bio: z.string(),
  isRestricted: z.boolean(),
});

export type MyProfileResponse = z.infer<typeof myProfileResponseSchema>;
