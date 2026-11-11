'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import { useForm, type FieldError } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { CreditCard, Info, Loader2, Lock, School } from 'lucide-react';
import { useBasket, useBasketQuote } from '@/components/store/basket-provider';
import { PromoCodeForm, TotalsList } from '@/components/store/basket-summary';
import { formatGBP } from '@/lib/utils/money';
import { cn } from '@/lib/utils/cn';
import { checkoutDetailsSchema, type CheckoutDetails } from '@/lib/validation/checkout';

const inputCls =
  'h-11 w-full rounded-xl border border-input bg-white px-3 text-[15px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring aria-[invalid=true]:border-danger-500';

function Field({
  id,
  label,
  error,
  hint,
  optional,
  children,
  className,
}: {
  id: string;
  label: string;
  error?: FieldError;
  hint?: string;
  optional?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1 block text-sm font-medium text-ink-900">
        {label} {optional && <span className="font-normal text-ink-600">(optional)</span>}
      </label>
      {children}
      {hint && !error && (
        <p id={`${id}-hint`} className="mt-1 text-xs text-ink-600">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="mt-1 text-sm text-danger-500" role="alert">
          {error.message}
        </p>
      )}
    </div>
  );
}

const describedBy = (id: string, err?: FieldError, hint?: boolean) =>
  err ? `${id}-error` : hint ? `${id}-hint` : undefined;

export function CheckoutForm({
  stripeEnabled,
  demoMode,
  defaultEmail,
}: {
  stripeEnabled: boolean;
  demoMode: boolean;
  defaultEmail: string;
}) {
  const { lines, ready, promoCode, clear } = useBasket();
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<CheckoutDetails>({
    resolver: zodResolver(checkoutDetailsSchema),
    defaultValues: {
      email: defaultEmail,
      deliveryMethod: 'standard',
      deliveringToSchool: false,
    },
    mode: 'onTouched',
  });
  const deliveryMethod = watch('deliveryMethod') ?? 'standard';
  const toSchool = watch('deliveringToSchool');
  const { quote, loading } = useBasketQuote(deliveryMethod);
  const blocked = quote?.lines.some((l) => !l.available || l.quantity > l.maxQty) ?? false;

  const onSubmit = async (details: CheckoutDetails) => {
    setSubmitError(null);
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          details,
          lines: lines.map((l) => ({ productId: l.productId, quantity: l.quantity })),
          promoCode: promoCode || null,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error?.message ?? 'Checkout failed. Please try again.');
      if (json.mode === 'demo') clear();
      else {
        // Basket clears when the customer lands on the confirmation page after paying.
        try {
          window.sessionStorage.setItem('ld-pending-order', json.orderNumber);
        } catch {
          // ignore
        }
      }
      window.location.assign(json.redirectUrl);
    } catch (err) {
      setSubmitError((err as Error).message);
    }
  };

  if (ready && lines.length === 0) {
    return (
      <div className="mt-6 rounded-2xl border border-dashed bg-white px-6 py-16 text-center">
        <h2 className="font-heading text-xl font-semibold text-brand-900">Your basket is empty</h2>
        <Link
          href="/shop"
          className="mt-4 inline-flex h-11 items-center rounded-full bg-cta px-6 font-semibold text-cta-foreground"
        >
          Start shopping
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="mt-6 grid gap-6 lg:grid-cols-[1fr_380px]">
      <div className="space-y-6">
        <section aria-labelledby="contact-h" className="rounded-2xl bg-white p-5 shadow-card sm:p-6">
          <h2 id="contact-h" className="font-heading text-xl font-bold text-brand-900">
            1. Your details
          </h2>
          <p className="mt-1 text-sm text-ink-600">
            Checking out as a guest.{' '}
            <Link href="/account" className="font-medium text-brand-600 underline-offset-2 hover:underline">
              Sign in
            </Link>{' '}
            to see your orders later.
          </p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field
              id="email"
              label="Email address"
              error={errors.email}
              hint="We’ll send your receipt and tracking here"
              className="sm:col-span-2"
            >
              <input
                id="email"
                type="email"
                autoComplete="email"
                className={inputCls}
                aria-invalid={!!errors.email}
                aria-describedby={describedBy('email', errors.email, true)}
                {...register('email')}
              />
            </Field>
            <Field id="fullName" label="Full name" error={errors.fullName}>
              <input
                id="fullName"
                autoComplete="name"
                className={inputCls}
                aria-invalid={!!errors.fullName}
                aria-describedby={describedBy('fullName', errors.fullName)}
                {...register('fullName')}
              />
            </Field>
            <Field id="phone" label="Phone number" error={errors.phone} hint="For delivery updates only">
              <input
                id="phone"
                type="tel"
                autoComplete="tel"
                className={inputCls}
                aria-invalid={!!errors.phone}
                aria-describedby={describedBy('phone', errors.phone, true)}
                {...register('phone')}
              />
            </Field>
          </div>
        </section>

        <section aria-labelledby="address-h" className="rounded-2xl bg-white p-5 shadow-card sm:p-6">
          <h2 id="address-h" className="font-heading text-xl font-bold text-brand-900">
            2. Delivery address
          </h2>
          <p className="mt-1 text-sm text-ink-600">
            UK addresses only. Postcode lookup is coming soon, so please type your address.
          </p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="flex items-start gap-3 rounded-xl border bg-surface-alt p-3 sm:col-span-2">
              <input
                type="checkbox"
                className="mt-1 size-4 accent-[#0E7490]"
                {...register('deliveringToSchool')}
              />
              <span>
                <span className="flex items-center gap-2 font-medium text-ink-900">
                  <School className="size-4 text-brand-600" aria-hidden /> Delivering to a school
                </span>
                <span className="block text-sm text-ink-600">
                  We’ll add the school name to the delivery label.
                </span>
              </span>
            </label>
            {toSchool ? (
              <Field id="schoolName" label="School name" error={errors.schoolName} className="sm:col-span-2">
                <input
                  id="schoolName"
                  autoComplete="organization"
                  className={inputCls}
                  aria-invalid={!!errors.schoolName}
                  aria-describedby={describedBy('schoolName', errors.schoolName)}
                  {...register('schoolName')}
                />
              </Field>
            ) : (
              <Field
                id="company"
                label="Company or organisation"
                optional
                error={errors.company}
                className="sm:col-span-2"
              >
                <input
                  id="company"
                  autoComplete="organization"
                  className={inputCls}
                  {...register('company')}
                />
              </Field>
            )}
            <Field id="line1" label="Address line 1" error={errors.line1} className="sm:col-span-2">
              <input
                id="line1"
                autoComplete="address-line1"
                className={inputCls}
                aria-invalid={!!errors.line1}
                aria-describedby={describedBy('line1', errors.line1)}
                {...register('line1')}
              />
            </Field>
            <Field id="line2" label="Address line 2" optional error={errors.line2} className="sm:col-span-2">
              <input id="line2" autoComplete="address-line2" className={inputCls} {...register('line2')} />
            </Field>
            <Field id="city" label="Town or city" error={errors.city}>
              <input
                id="city"
                autoComplete="address-level2"
                className={inputCls}
                aria-invalid={!!errors.city}
                aria-describedby={describedBy('city', errors.city)}
                {...register('city')}
              />
            </Field>
            <Field id="postcode" label="Postcode" error={errors.postcode}>
              <input
                id="postcode"
                autoComplete="postal-code"
                className={cn(inputCls, 'uppercase')}
                aria-invalid={!!errors.postcode}
                aria-describedby={describedBy('postcode', errors.postcode)}
                {...register('postcode')}
              />
            </Field>
            <Field
              id="schoolPoNumber"
              label="School purchase order (PO) number"
              optional
              error={errors.schoolPoNumber}
              hint="Shown on your invoice"
              className="sm:col-span-2"
            >
              <input
                id="schoolPoNumber"
                className={inputCls}
                aria-describedby={describedBy('schoolPoNumber', errors.schoolPoNumber, true)}
                {...register('schoolPoNumber')}
              />
            </Field>
            <Field id="notes" label="Delivery notes" optional error={errors.notes} className="sm:col-span-2">
              <textarea
                id="notes"
                rows={2}
                className={cn(inputCls, 'h-auto py-2')}
                placeholder="e.g. Deliver to school reception"
                {...register('notes')}
              />
            </Field>
          </div>
        </section>

        <section aria-labelledby="delivery-h" className="rounded-2xl bg-white p-5 shadow-card sm:p-6">
          <h2 id="delivery-h" className="font-heading text-xl font-bold text-brand-900">
            3. Delivery method
          </h2>
          <fieldset className="mt-4 grid gap-3 sm:grid-cols-2">
            <legend className="sr-only">Delivery method</legend>
            {(
              quote?.totals.deliveryOptions ?? [
                { id: 'standard', label: 'Standard delivery', eta: '2–4 working days', price: 4.99 },
                { id: 'next_day', label: 'Next working day', eta: 'Order by 2pm, Mon–Fri', price: 9.99 },
              ]
            ).map((o) => (
              <label
                key={o.id}
                className="flex cursor-pointer items-start gap-3 rounded-xl border p-4 has-[:checked]:border-brand-600 has-[:checked]:bg-brand-50"
              >
                <input
                  type="radio"
                  value={o.id}
                  className="mt-1 size-4 accent-[#0E7490]"
                  {...register('deliveryMethod')}
                />
                <span className="flex-1">
                  <span className="flex justify-between font-semibold text-ink-900">
                    {o.label}
                    <span className="tabular">{o.price === 0 ? 'Free' : formatGBP(o.price)}</span>
                  </span>
                  <span className="block text-sm text-ink-600">{o.eta}</span>
                </span>
              </label>
            ))}
          </fieldset>
        </section>
      </div>

      <aside
        aria-label="Order summary"
        className="h-fit space-y-4 rounded-2xl bg-white p-5 shadow-card sm:p-6 lg:sticky lg:top-44"
      >
        <h2 className="font-heading text-xl font-bold text-brand-900">Order summary</h2>
        <ul className="max-h-72 space-y-3 overflow-y-auto">
          {lines.map((l) => {
            const q = quote?.lines.find((x) => x.productId === l.productId);
            return (
              <li key={l.productId} className="flex gap-3">
                <div className="relative size-14 shrink-0 overflow-hidden rounded-lg bg-surface-alt">
                  {l.image && <Image src={l.image} alt="" fill sizes="56px" className="object-contain" />}
                  <span className="absolute -right-1 -top-1 grid min-w-5 place-items-center rounded-full bg-brand-900 px-1 text-[11px] font-bold leading-5 text-white">
                    {l.quantity}
                  </span>
                </div>
                <div className="min-w-0 flex-1 text-sm">
                  <p className="line-clamp-2 font-medium text-ink-900">{l.name}</p>
                  {q?.message && (
                    <p className={q.available ? 'text-xs text-warn-700' : 'text-xs text-danger-500'}>
                      {q.message}
                    </p>
                  )}
                </div>
                <span className="tabular text-sm font-semibold">{formatGBP(l.priceIncVat * l.quantity)}</span>
              </li>
            );
          })}
        </ul>
        <PromoCodeForm totals={quote?.totals ?? null} loading={loading} />
        {quote ? (
          <TotalsList totals={quote.totals} />
        ) : (
          <p className="flex items-center gap-2 text-sm text-ink-600">
            <Loader2 className="size-4 animate-spin" aria-hidden /> Checking prices…
          </p>
        )}

        <label className="flex items-start gap-3 text-sm">
          <input
            type="checkbox"
            className="mt-1 size-4 accent-[#0E7490]"
            aria-invalid={!!errors.acceptTerms}
            aria-describedby={errors.acceptTerms ? 'acceptTerms-error' : undefined}
            {...register('acceptTerms')}
          />
          <span>
            I agree to the{' '}
            <Link href="/terms" target="_blank" className="font-medium text-brand-600 underline">
              terms and conditions
            </Link>{' '}
            and have read the{' '}
            <Link href="/privacy" target="_blank" className="font-medium text-brand-600 underline">
              privacy policy
            </Link>
            .
          </span>
        </label>
        {errors.acceptTerms && (
          <p id="acceptTerms-error" className="-mt-2 text-sm text-danger-500" role="alert">
            {errors.acceptTerms.message}
          </p>
        )}

        {submitError && (
          <p className="rounded-xl bg-danger-500/10 p-3 text-sm text-danger-500" role="alert">
            {submitError}
          </p>
        )}
        <button
          type="submit"
          disabled={isSubmitting || !quote || blocked}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-cta font-semibold text-cta-foreground hover:bg-cta-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
        >
          {isSubmitting ? (
            <Loader2 className="size-5 animate-spin" aria-hidden />
          ) : (
            <Lock className="size-4" aria-hidden />
          )}
          {isSubmitting
            ? 'Placing order…'
            : stripeEnabled
              ? `Pay ${quote ? formatGBP(quote.totals.total) : ''} securely`
              : 'Place order'}
        </button>
        <p className="flex items-center justify-center gap-2 text-xs text-ink-600">
          <CreditCard className="size-4" aria-hidden /> Payments handled by Stripe. We never see your card
          details.
        </p>

        {demoMode && (
          <div
            className="flex gap-2 rounded-xl border border-brand-600/30 bg-brand-50 p-3 text-xs text-ink-900"
            role="note"
          >
            <Info className="mt-0.5 size-4 shrink-0 text-brand-600" aria-hidden />
            {stripeEnabled ? (
              <p>
                <strong>Demo:</strong> Stripe is in test mode. Pay with card{' '}
                <span className="tabular font-semibold">4242 4242 4242 4242</span>, any future expiry date and
                any 3-digit CVC. No real money is taken.
              </p>
            ) : (
              <p>
                <strong>Demo:</strong> Stripe isn’t configured, so payment is simulated and your order is
                marked paid straight away.
              </p>
            )}
          </div>
        )}
      </aside>
    </form>
  );
}
