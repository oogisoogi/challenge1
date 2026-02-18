'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { RoleSelector } from './role-selector';
import { useOnboardingMutation } from '@/features/auth/hooks/useOnboardingMutation';
import { phoneSchema } from '@/features/auth/lib/validation';

const onboardingFormSchema = z.object({
  role: z.enum(['learner', 'instructor'], {
    errorMap: () => ({
      message: '역할을 선택해주세요.',
    }),
  }),
  name: z.string().min(1, { message: '이름을 입력해주세요.' }),
  phone: phoneSchema,
  bio: z.string().default(''),
  termsAgreed: z.literal(true, {
    errorMap: () => ({ message: '약관에 동의해야 합니다.' }),
  }),
});

type OnboardingFormValues = z.infer<typeof onboardingFormSchema>;

export const OnboardingForm = () => {
  const { mutate, isPending, error } = useOnboardingMutation();

  const form = useForm<OnboardingFormValues>({
    resolver: zodResolver(onboardingFormSchema),
    defaultValues: {
      role: undefined,
      name: '',
      phone: '',
      bio: '',
      termsAgreed: undefined,
    },
  });

  const selectedRole = form.watch('role');

  const onSubmit = (values: OnboardingFormValues) => {
    mutate({
      role: values.role,
      name: values.name,
      phone: values.phone,
      bio: values.role === 'instructor' ? values.bio : '',
      termsAgreed: values.termsAgreed,
    });
  };

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="flex flex-col gap-6"
      >
        <FormField
          control={form.control}
          name="role"
          render={({ field }) => (
            <FormItem>
              <FormLabel>역할 선택</FormLabel>
              <FormControl>
                <RoleSelector
                  value={field.value}
                  onChange={field.onChange}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>이름</FormLabel>
              <FormControl>
                <Input
                  placeholder="이름을 입력해주세요"
                  autoComplete="name"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="phone"
          render={({ field }) => (
            <FormItem>
              <FormLabel>휴대폰번호</FormLabel>
              <FormControl>
                <Input
                  type="tel"
                  placeholder="010-1234-5678"
                  autoComplete="tel"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {selectedRole === 'instructor' ? (
          <FormField
            control={form.control}
            name="bio"
            render={({ field }) => (
              <FormItem>
                <FormLabel>소개/약력 (Bio)</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="강사 소개를 입력해주세요 (선택)"
                    rows={4}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        ) : null}

        <FormField
          control={form.control}
          name="termsAgreed"
          render={({ field }) => (
            <FormItem className="flex flex-row items-start gap-3 space-y-0">
              <FormControl>
                <Checkbox
                  checked={field.value === true}
                  onCheckedChange={(checked) =>
                    field.onChange(checked === true ? true : undefined)
                  }
                />
              </FormControl>
              <div className="space-y-1 leading-none">
                <FormLabel className="cursor-pointer">
                  이용약관 및 개인정보 처리방침에 동의합니다.
                </FormLabel>
                <FormMessage />
              </div>
            </FormItem>
          )}
        />

        {error ? (
          <p className="text-sm text-rose-500">{error.message}</p>
        ) : null}

        <Button type="submit" disabled={isPending} className="w-full">
          {isPending ? '처리 중...' : '완료'}
        </Button>
      </form>
    </Form>
  );
};
