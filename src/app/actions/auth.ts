'use server';

import { authApi, ApiError, type AuthResponse, type OtpResponse, type User } from '@/lib/api';
import { setSessionCookie, clearSessionCookie } from '@/lib/session';

export type ActionState =
  | { ok: true; user?: User; message?: string }
  | { ok: false; error: string; code?: string };

function toError(e: unknown): ActionState {
  if (e instanceof ApiError) {
    const detail = e.detail;
    if (detail && typeof detail === 'object' && 'code' in detail) {
      return {
        ok: false,
        error: ('message' in detail ? String((detail as { message: unknown }).message) : e.message) || 'Request failed',
        code: String((detail as { code: unknown }).code),
      };
    }
    return { ok: false, error: e.message || 'Request failed' };
  }
  return { ok: false, error: e instanceof Error ? e.message : 'Unexpected error' };
}

async function authSuccess(res: AuthResponse): Promise<ActionState> {
  await setSessionCookie(res.accessToken);
  return { ok: true, user: res.user };
}

export async function loginAction(email: string, password: string): Promise<ActionState> {
  try {
    return await authSuccess(await authApi.login(email, password));
  } catch (e) {
    return toError(e);
  }
}

export async function registerAction(
  name: string,
  email: string,
  password: string,
): Promise<ActionState & { otpSent?: boolean }> {
  try {
    const r: OtpResponse = await authApi.register(name, email, password);
    return { ok: true, message: r.message, otpSent: true };
  } catch (e) {
    return toError(e);
  }
}

export async function verifyOtpAction(email: string, otp: string): Promise<ActionState> {
  try {
    return await authSuccess(await authApi.verifyOtp(email, otp));
  } catch (e) {
    return toError(e);
  }
}

export async function resendOtpAction(email: string): Promise<ActionState> {
  try {
    const r = await authApi.resendOtp(email);
    return { ok: true, message: r.message };
  } catch (e) {
    return toError(e);
  }
}

export async function googleSignInAction(idToken: string): Promise<ActionState> {
  try {
    return await authSuccess(await authApi.google(idToken));
  } catch (e) {
    return toError(e);
  }
}

export async function forgotPasswordAction(email: string): Promise<ActionState> {
  try {
    const r = await authApi.forgotPassword(email);
    return { ok: true, message: r.message };
  } catch (e) {
    return toError(e);
  }
}

export async function resetPasswordAction(
  email: string,
  otp: string,
  newPassword: string,
): Promise<ActionState> {
  try {
    const r = await authApi.resetPassword(email, otp, newPassword);
    return { ok: true, message: r.message };
  } catch (e) {
    return toError(e);
  }
}

export async function logoutAction(): Promise<{ ok: true }> {
  await clearSessionCookie();
  return { ok: true };
}
