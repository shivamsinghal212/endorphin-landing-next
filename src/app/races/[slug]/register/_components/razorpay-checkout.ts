/**
 * Thin promise wrapper around Razorpay Web Checkout.
 *
 * The Razorpay SDK is loaded by `<Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="lazyOnload" />`
 * mounted on the form page, which attaches `window.Razorpay`. We use a single
 * `(window as any).Razorpay` cast because the vendor's checkout.js does not
 * ship typings on npm — it's a globally-injected constructor. Don't replace
 * this with `unknown` + cast chains; the property genuinely is dynamic.
 */

export interface RazorpayOpenOptions {
  keyId: string;
  orderId: string;
  amount: number; // paise
  currency: string;
  name: string; // platform name shown in modal
  description: string; // event title
  prefill: { name: string; email: string; contact: string };
  themeColor?: string;
}

export interface RazorpaySuccessPayload {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

export type RazorpayResult =
  | { ok: true; payload: RazorpaySuccessPayload }
  | { ok: false; reason: 'dismissed' | 'failed'; error?: unknown };

interface RazorpayInstance {
  open: () => void;
  on: (event: string, cb: (payload: unknown) => void) => void;
}

interface RazorpayConstructor {
  new (config: Record<string, unknown>): RazorpayInstance;
}

export function isRazorpayLoaded(): boolean {
  if (typeof window === 'undefined') return false;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return typeof (window as any).Razorpay === 'function';
}

export function openRazorpayCheckout(
  opts: RazorpayOpenOptions,
): Promise<RazorpayResult> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') {
      resolve({ ok: false, reason: 'failed', error: new Error('SSR') });
      return;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const Ctor = (window as any).Razorpay as RazorpayConstructor | undefined;
    if (!Ctor) {
      resolve({
        ok: false,
        reason: 'failed',
        error: new Error('Razorpay SDK not loaded yet — please retry in a moment.'),
      });
      return;
    }

    let settled = false;
    const settle = (result: RazorpayResult) => {
      if (settled) return;
      settled = true;
      resolve(result);
    };

    const rzp = new Ctor({
      key: opts.keyId,
      order_id: opts.orderId,
      amount: opts.amount,
      currency: opts.currency,
      name: opts.name,
      description: opts.description,
      prefill: opts.prefill,
      theme: { color: opts.themeColor ?? '#0A0A0A' },
      handler: (payload: unknown) => {
        const p = payload as Partial<RazorpaySuccessPayload> | null;
        if (
          p &&
          typeof p.razorpay_payment_id === 'string' &&
          typeof p.razorpay_order_id === 'string' &&
          typeof p.razorpay_signature === 'string'
        ) {
          settle({
            ok: true,
            payload: {
              razorpay_payment_id: p.razorpay_payment_id,
              razorpay_order_id: p.razorpay_order_id,
              razorpay_signature: p.razorpay_signature,
            },
          });
        } else {
          settle({ ok: false, reason: 'failed', error: new Error('Unexpected handler payload') });
        }
      },
      modal: {
        ondismiss: () => settle({ ok: false, reason: 'dismissed' }),
      },
    });
    rzp.on('payment.failed', (e: unknown) =>
      settle({ ok: false, reason: 'failed', error: e }),
    );
    rzp.open();
  });
}
