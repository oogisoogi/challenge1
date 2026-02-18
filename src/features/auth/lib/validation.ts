import { z } from 'zod';

export const PASSWORD_MIN_LENGTH = 6;
export const PHONE_REGEX = /^01[016789]-?\d{3,4}-?\d{4}$/;

export const passwordSchema = z
  .string()
  .min(PASSWORD_MIN_LENGTH, {
    message: `비밀번호는 ${PASSWORD_MIN_LENGTH}자 이상이어야 합니다.`,
  });

export const phoneSchema = z
  .string()
  .regex(PHONE_REGEX, {
    message: '유효한 전화번호를 입력해주세요.',
  });

export const emailSchema = z
  .string()
  .email({ message: '유효한 이메일을 입력해주세요.' });
