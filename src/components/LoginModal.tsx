'use client';

import * as Dialog from '@radix-ui/react-dialog';
import { useEffect, useRef, useState, useTransition, type ReactNode } from 'react';
import {
  loginAction,
  registerAction,
  verifyOtpAction,
  resendOtpAction,
  forgotPasswordAction,
  resetPasswordAction,
  googleSignInAction,
} from '@/app/actions/auth';
import type { User } from '@/lib/api';
import GoogleSignInButton from '@/components/GoogleSignInButton';

type Screen = 'signin' | 'signup' | 'otp' | 'forgot' | 'reset';

interface LoginModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: (user: User) => void;
  /** Optional contextual content shown above the heading (e.g. race coupon strip). */
  context?: ReactNode;
  /** Headline override. Default: "Welcome back." / "Join endorfin." per screen. */
  title?: ReactNode;
  /** Subtitle override. */
  subtitle?: ReactNode;
  initialScreen?: Screen;
}

export default function LoginModal({
  open,
  onClose,
  onSuccess,
  context,
  title,
  subtitle,
  initialScreen = 'signin',
}: LoginModalProps) {
  const [screen, setScreen] = useState<Screen>(initialScreen);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [resendCountdown, setResendCountdown] = useState(0);

  // Reset to initial screen each time the modal opens
  useEffect(() => {
    if (open) {
      setScreen(initialScreen);
      setError(null);
      setInfo(null);
    }
  }, [open, initialScreen]);

  // Resend countdown ticker (60s)
  useEffect(() => {
    if (resendCountdown <= 0) return;
    const t = window.setInterval(() => setResendCountdown((c) => Math.max(0, c - 1)), 1000);
    return () => window.clearInterval(t);
  }, [resendCountdown]);

  function go(s: Screen) {
    setScreen(s);
    setError(null);
    setInfo(null);
  }

  function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const r = await loginAction(email.trim().toLowerCase(), password);
      if (r.ok && r.user) {
        onSuccess?.(r.user);
        onClose();
      } else if (!r.ok && r.code === 'EMAIL_NOT_VERIFIED') {
        // Backend already resent OTP — go straight to OTP screen
        setResendCountdown(60);
        setInfo('Email not verified yet. We sent a fresh code.');
        go('otp');
      } else if (!r.ok) {
        setError(r.error);
      }
    });
  }

  function handleSignUp(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    startTransition(async () => {
      const r = await registerAction(name.trim(), email.trim().toLowerCase(), password);
      if (r.ok) {
        setResendCountdown(60);
        setInfo('Check your inbox for a 6-digit verification code.');
        go('otp');
      } else {
        setError(r.error);
      }
    });
  }

  function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (otp.length !== 6) {
      setError('Enter the 6-digit code');
      return;
    }
    startTransition(async () => {
      const r = await verifyOtpAction(email.trim().toLowerCase(), otp);
      if (r.ok && r.user) {
        onSuccess?.(r.user);
        onClose();
      } else if (!r.ok) {
        setError(r.error);
      }
    });
  }

  function handleResend() {
    if (resendCountdown > 0) return;
    setError(null);
    startTransition(async () => {
      const r = await resendOtpAction(email.trim().toLowerCase());
      if (r.ok) {
        setResendCountdown(60);
        setInfo('Code resent. Check your email.');
      } else if (!r.ok) {
        setError(r.error);
      }
    });
  }

  function handleForgot(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const r = await forgotPasswordAction(email.trim().toLowerCase());
      if (r.ok) {
        setResendCountdown(60);
        setInfo('If an account exists, a 6-digit code is on its way.');
        go('reset');
      } else if (!r.ok) {
        setError(r.error);
      }
    });
  }

  function handleReset(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (otp.length !== 6) {
      setError('Enter the 6-digit code');
      return;
    }
    if (newPassword.length < 8) {
      setError('New password must be at least 8 characters');
      return;
    }
    startTransition(async () => {
      const r = await resetPasswordAction(email.trim().toLowerCase(), otp, newPassword);
      if (r.ok) {
        setInfo('Password reset. Sign in with your new password.');
        setPassword('');
        setOtp('');
        setNewPassword('');
        go('signin');
      } else if (!r.ok) {
        setError(r.error);
      }
    });
  }

  function handleGoogleCredential(idToken: string) {
    setError(null);
    startTransition(async () => {
      const r = await googleSignInAction(idToken);
      if (r.ok && r.user) {
        onSuccess?.(r.user);
        onClose();
      } else if (!r.ok) {
        setError(r.error);
      }
    });
  }

  return (
    <Dialog.Root open={open} onOpenChange={(o) => !o && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="v1lm-overlay" />
        <Dialog.Content
          className="v1lm-modal"
          aria-describedby={undefined}
          // Prevent auto-focusing the first input on open. Default behavior
          // scrolls the page to bring the focused input into view, which
          // looks like a "page jumps up" glitch.
          onOpenAutoFocus={(e) => e.preventDefault()}
          onInteractOutside={(e) => {
            // Allow click-outside to close, but not while pending.
            if (pending) e.preventDefault();
          }}
        >
          <Dialog.Title className="sr-only">Sign in to Endorfin</Dialog.Title>

          <button
            type="button"
            className="v1lm-close"
            aria-label="Close"
            onClick={() => onClose()}
            disabled={pending}
          >
            <CloseIcon />
          </button>

          {context && <div className="v1lm-context">{context}</div>}

          <div className="v1lm-body">
            {screen === 'signin' && (
              <SignInScreen
                email={email}
                password={password}
                showPassword={showPassword}
                onEmail={setEmail}
                onPassword={setPassword}
                onTogglePassword={() => setShowPassword((s) => !s)}
                onSubmit={handleSignIn}
                onGoogleCredential={handleGoogleCredential}
                googleContext="signin"
                onSwitchToSignup={() => go('signup')}
                onForgot={() => go('forgot')}
                error={error}
                info={info}
                pending={pending}
                title={title}
                subtitle={subtitle}
              />
            )}

            {screen === 'signup' && (
              <SignUpScreen
                name={name}
                email={email}
                password={password}
                showPassword={showPassword}
                onName={setName}
                onEmail={setEmail}
                onPassword={setPassword}
                onTogglePassword={() => setShowPassword((s) => !s)}
                onSubmit={handleSignUp}
                onGoogleCredential={handleGoogleCredential}
                googleContext="signup"
                onSwitchToSignin={() => go('signin')}
                error={error}
                info={info}
                pending={pending}
                title={title}
                subtitle={subtitle}
              />
            )}

            {screen === 'otp' && (
              <OtpScreen
                email={email}
                otp={otp}
                onOtp={setOtp}
                onSubmit={handleVerifyOtp}
                onResend={handleResend}
                onBack={() => go('signin')}
                resendCountdown={resendCountdown}
                error={error}
                info={info}
                pending={pending}
              />
            )}

            {screen === 'forgot' && (
              <ForgotScreen
                email={email}
                onEmail={setEmail}
                onSubmit={handleForgot}
                onBack={() => go('signin')}
                error={error}
                info={info}
                pending={pending}
              />
            )}

            {screen === 'reset' && (
              <ResetScreen
                email={email}
                otp={otp}
                newPassword={newPassword}
                showPassword={showPassword}
                onOtp={setOtp}
                onNewPassword={setNewPassword}
                onTogglePassword={() => setShowPassword((s) => !s)}
                onSubmit={handleReset}
                onResend={handleResend}
                onBack={() => go('signin')}
                resendCountdown={resendCountdown}
                error={error}
                info={info}
                pending={pending}
              />
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

// ─── Screens ─────────────────────────────────────────────────────────────

function SignInScreen(props: {
  email: string;
  password: string;
  showPassword: boolean;
  onEmail: (v: string) => void;
  onPassword: (v: string) => void;
  onTogglePassword: () => void;
  onSubmit: (e: React.FormEvent) => void;
  onGoogleCredential: (idToken: string) => void;
  googleContext: 'signin' | 'signup';
  onSwitchToSignup: () => void;
  onForgot: () => void;
  error: string | null;
  info: string | null;
  pending: boolean;
  title?: ReactNode;
  subtitle?: ReactNode;
}) {
  return (
    <form onSubmit={props.onSubmit} className="v1lm-form">
      <h2 className="v1lm-h2">{props.title || <>Welcome <span className="v1lm-red">back.</span></>}</h2>
      <p className="v1lm-sub">
        {props.subtitle || 'Sign in to reveal coupon codes and sync with the app.'}
      </p>

      <GoogleSignInButton onCredential={props.onGoogleCredential} context={props.googleContext} />
      <OrLine />

      <Field label="Email">
        <input
          type="email"
          autoComplete="email"
          required
          className="v1lm-input"
          value={props.email}
          onChange={(e) => props.onEmail(e.target.value)}
          placeholder="you@example.com"
          disabled={props.pending}
        />
      </Field>

      <Field
        label="Password"
        rightHint={
          <button type="button" className="v1lm-hint" onClick={props.onForgot}>
            Forgot?
          </button>
        }
      >
        <PasswordInput
          value={props.password}
          onChange={props.onPassword}
          show={props.showPassword}
          onToggle={props.onTogglePassword}
          autoComplete="current-password"
          disabled={props.pending}
        />
      </Field>

      <FormFeedback error={props.error} info={props.info} />

      <button type="submit" className="v1lm-btn-primary" disabled={props.pending}>
        {props.pending ? 'Signing in…' : 'Sign in'}
      </button>

      <div className="v1lm-toggle-row">
        New to Endorfin?{' '}
        <button type="button" className="v1lm-link" onClick={props.onSwitchToSignup}>
          Create an account
        </button>
      </div>
    </form>
  );
}

function SignUpScreen(props: {
  name: string;
  email: string;
  password: string;
  showPassword: boolean;
  onName: (v: string) => void;
  onEmail: (v: string) => void;
  onPassword: (v: string) => void;
  onTogglePassword: () => void;
  onSubmit: (e: React.FormEvent) => void;
  onGoogleCredential: (idToken: string) => void;
  googleContext: 'signin' | 'signup';
  onSwitchToSignin: () => void;
  error: string | null;
  info: string | null;
  pending: boolean;
  title?: ReactNode;
  subtitle?: ReactNode;
}) {
  return (
    <form onSubmit={props.onSubmit} className="v1lm-form">
      <h2 className="v1lm-h2">{props.title || <>Join <span className="v1lm-red">endorfin.</span></>}</h2>
      <p className="v1lm-sub">
        {props.subtitle ||
          'Free, takes 30 seconds. Save races, see member coupons, sync with the app.'}
      </p>

      <GoogleSignInButton onCredential={props.onGoogleCredential} context={props.googleContext} />
      <OrLine />

      <Field label="Name">
        <input
          type="text"
          autoComplete="name"
          required
          className="v1lm-input"
          value={props.name}
          onChange={(e) => props.onName(e.target.value)}
          placeholder="Your name"
          disabled={props.pending}
        />
      </Field>
      <Field label="Email">
        <input
          type="email"
          autoComplete="email"
          required
          className="v1lm-input"
          value={props.email}
          onChange={(e) => props.onEmail(e.target.value)}
          placeholder="you@example.com"
          disabled={props.pending}
        />
      </Field>
      <Field label="Password">
        <PasswordInput
          value={props.password}
          onChange={props.onPassword}
          show={props.showPassword}
          onToggle={props.onTogglePassword}
          autoComplete="new-password"
          disabled={props.pending}
          placeholder="At least 8 characters"
        />
      </Field>

      <FormFeedback error={props.error} info={props.info} />

      <button type="submit" className="v1lm-btn-primary" disabled={props.pending}>
        {props.pending ? 'Creating account…' : 'Create account'}
      </button>

      <p className="v1lm-legal">
        By continuing you agree to our <a href="/terms">terms</a> and{' '}
        <a href="/privacy">privacy</a>.
      </p>

      <div className="v1lm-toggle-row">
        Already have an account?{' '}
        <button type="button" className="v1lm-link" onClick={props.onSwitchToSignin}>
          Sign in
        </button>
      </div>
    </form>
  );
}

function OtpScreen(props: {
  email: string;
  otp: string;
  onOtp: (v: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onResend: () => void;
  onBack: () => void;
  resendCountdown: number;
  error: string | null;
  info: string | null;
  pending: boolean;
}) {
  return (
    <form onSubmit={props.onSubmit} className="v1lm-form">
      <button type="button" className="v1lm-back" onClick={props.onBack}>
        <BackIcon /> Back
      </button>
      <span className="v1lm-step-marker">
        <MailIcon /> Code sent to {props.email}
      </span>
      <h2 className="v1lm-h2">Check your <span className="v1lm-red">inbox.</span></h2>
      <p className="v1lm-sub">Enter the 6-digit code we just emailed you. It expires in 10 minutes.</p>

      <OtpInput value={props.otp} onChange={props.onOtp} disabled={props.pending} />

      <FormFeedback error={props.error} info={props.info} />

      <button type="submit" className="v1lm-btn-primary" disabled={props.pending || props.otp.length !== 6}>
        {props.pending ? 'Verifying…' : 'Verify & continue'}
      </button>

      <p className="v1lm-otp-resend">
        Didn&apos;t get it?{' '}
        {props.resendCountdown > 0 ? (
          <span className="v1lm-countdown">Resend in {props.resendCountdown}s</span>
        ) : (
          <button type="button" className="v1lm-link-red" onClick={props.onResend}>
            Resend code
          </button>
        )}
      </p>
    </form>
  );
}

function ForgotScreen(props: {
  email: string;
  onEmail: (v: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onBack: () => void;
  error: string | null;
  info: string | null;
  pending: boolean;
}) {
  return (
    <form onSubmit={props.onSubmit} className="v1lm-form">
      <button type="button" className="v1lm-back" onClick={props.onBack}>
        <BackIcon /> Back to sign in
      </button>
      <h2 className="v1lm-h2">Reset your <span className="v1lm-red">password.</span></h2>
      <p className="v1lm-sub">
        Enter the email tied to your account and we&apos;ll send a 6-digit code.
      </p>

      <Field label="Email">
        <input
          type="email"
          autoComplete="email"
          required
          className="v1lm-input"
          value={props.email}
          onChange={(e) => props.onEmail(e.target.value)}
          placeholder="you@example.com"
          disabled={props.pending}
        />
      </Field>

      <FormFeedback error={props.error} info={props.info} />

      <button type="submit" className="v1lm-btn-primary" disabled={props.pending}>
        {props.pending ? 'Sending…' : 'Send reset code'}
      </button>
    </form>
  );
}

function ResetScreen(props: {
  email: string;
  otp: string;
  newPassword: string;
  showPassword: boolean;
  onOtp: (v: string) => void;
  onNewPassword: (v: string) => void;
  onTogglePassword: () => void;
  onSubmit: (e: React.FormEvent) => void;
  onResend: () => void;
  onBack: () => void;
  resendCountdown: number;
  error: string | null;
  info: string | null;
  pending: boolean;
}) {
  return (
    <form onSubmit={props.onSubmit} className="v1lm-form">
      <span className="v1lm-step-marker">Code sent to {props.email}</span>
      <h2 className="v1lm-h2">New <span className="v1lm-red">password.</span></h2>
      <p className="v1lm-sub">
        Enter the 6-digit code from your email and choose a new password — at least 8 characters.
      </p>

      <Field label="Verification code">
        <OtpInput value={props.otp} onChange={props.onOtp} disabled={props.pending} />
      </Field>

      <Field label="New password">
        <PasswordInput
          value={props.newPassword}
          onChange={props.onNewPassword}
          show={props.showPassword}
          onToggle={props.onTogglePassword}
          autoComplete="new-password"
          disabled={props.pending}
          placeholder="At least 8 characters"
        />
      </Field>

      <FormFeedback error={props.error} info={props.info} />

      <button type="submit" className="v1lm-btn-primary" disabled={props.pending}>
        {props.pending ? 'Resetting…' : 'Reset & sign in'}
      </button>

      <p className="v1lm-otp-resend">
        Didn&apos;t get it?{' '}
        {props.resendCountdown > 0 ? (
          <span className="v1lm-countdown">Resend in {props.resendCountdown}s</span>
        ) : (
          <button type="button" className="v1lm-link-red" onClick={props.onResend}>
            Resend code
          </button>
        )}
      </p>

      <div className="v1lm-toggle-row">
        <button type="button" className="v1lm-link" onClick={props.onBack}>
          Back to sign in
        </button>
      </div>
    </form>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────

function Field({
  label,
  children,
  rightHint,
}: {
  label: string;
  children: ReactNode;
  rightHint?: ReactNode;
}) {
  return (
    <div className="v1lm-field">
      <label className="v1lm-label">
        <span>{label}</span>
        {rightHint}
      </label>
      {children}
    </div>
  );
}

function PasswordInput(props: {
  value: string;
  onChange: (v: string) => void;
  show: boolean;
  onToggle: () => void;
  autoComplete?: string;
  disabled?: boolean;
  placeholder?: string;
}) {
  return (
    <div className="v1lm-input-wrap">
      <input
        type={props.show ? 'text' : 'password'}
        className="v1lm-input v1lm-has-icon"
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
        autoComplete={props.autoComplete}
        disabled={props.disabled}
        placeholder={props.placeholder || ''}
        required
        minLength={8}
      />
      <button
        type="button"
        className="v1lm-input-icon"
        onClick={props.onToggle}
        aria-label={props.show ? 'Hide password' : 'Show password'}
        tabIndex={-1}
      >
        {props.show ? <EyeOffIcon /> : <EyeIcon />}
      </button>
    </div>
  );
}

function OtpInput({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);

  function setCell(i: number, v: string) {
    const cleaned = v.replace(/[^0-9]/g, '').slice(0, 1);
    const arr = value.padEnd(6, ' ').split('');
    arr[i] = cleaned || ' ';
    const next = arr.join('').replace(/\s+$/, '');
    onChange(next);
    if (cleaned && i < 5) refs.current[i + 1]?.focus();
  }

  function handlePaste(e: React.ClipboardEvent) {
    const pasted = e.clipboardData.getData('text').replace(/[^0-9]/g, '').slice(0, 6);
    if (pasted.length === 6) {
      e.preventDefault();
      onChange(pasted);
      refs.current[5]?.focus();
    }
  }

  function handleKey(i: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace' && !value[i] && i > 0) refs.current[i - 1]?.focus();
  }

  return (
    <div className="v1lm-otp-row" onPaste={handlePaste}>
      {Array.from({ length: 6 }).map((_, i) => (
        <input
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
          type="text"
          inputMode="numeric"
          maxLength={1}
          className={`v1lm-otp-cell ${value[i] ? 'is-filled' : ''}`}
          value={value[i] || ''}
          onChange={(e) => setCell(i, e.target.value)}
          onKeyDown={(e) => handleKey(i, e)}
          disabled={disabled}
          aria-label={`Digit ${i + 1}`}
        />
      ))}
    </div>
  );
}

function FormFeedback({ error, info }: { error: string | null; info: string | null }) {
  if (!error && !info) return null;
  return (
    <div className={`v1lm-feedback ${error ? 'is-error' : 'is-info'}`} role={error ? 'alert' : 'status'}>
      {error || info}
    </div>
  );
}

function OrLine() {
  return <div className="v1lm-or">or with email</div>;
}

// ─── Icons ───────────────────────────────────────────────────────────────

function CloseIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M18 6L6 18M6 6l12 12" />
    </svg>
  );
}
function BackIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
      <path d="M19 12H5M11 18l-6-6 6-6" />
    </svg>
  );
}
function MailIcon() {
  return (
    <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
      <path d="M22 6l-10 7L2 6" />
      <rect x="2" y="4" width="20" height="16" rx="2" />
    </svg>
  );
}
function EyeIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}
function EyeOffIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
}
