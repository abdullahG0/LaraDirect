'use client';

import { useState } from 'react';
import { CheckCircle2, Loader2 } from 'lucide-react';

const inputCls =
  'w-full rounded-xl border border-input bg-white px-3 py-2.5 text-[15px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

interface FieldDef {
  name: string;
  label: string;
  type?: 'text' | 'email' | 'tel' | 'textarea';
  required?: boolean;
  autoComplete?: string;
  placeholder?: string;
  wide?: boolean;
}

/** Contact and bulk-quote form (step 8.1). Posts to /api/contact with a honeypot field. */
export function EnquiryForm({
  kind,
  fields,
  submitLabel,
  defaults = {},
}: {
  kind: 'contact' | 'quote';
  fields: FieldDef[];
  submitLabel: string;
  defaults?: Record<string, string>;
}) {
  const [values, setValues] = useState<Record<string, string>>(defaults);
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent'>('idle');
  const [error, setError] = useState<string | null>(null);

  if (status === 'sent') {
    return (
      <div
        className="rounded-2xl border border-success-600/30 bg-success-600/5 p-6 text-center"
        role="status"
      >
        <CheckCircle2 className="mx-auto size-10 text-success-600" aria-hidden />
        <p className="mt-2 font-heading text-lg font-semibold text-brand-900">
          Thanks, we’ve got your message
        </p>
        <p className="text-ink-600">We reply within one working day.</p>
      </div>
    );
  }

  return (
    <form
      noValidate
      onSubmit={async (e) => {
        e.preventDefault();
        setStatus('sending');
        setError(null);
        const clean = Object.fromEntries(Object.entries(values).filter(([, v]) => v.trim() !== ''));
        try {
          const res = await fetch('/api/contact', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ kind, ...clean }),
          });
          const json = await res.json();
          if (!res.ok) throw new Error(json?.error?.message ?? 'Something went wrong');
          setStatus('sent');
        } catch (err) {
          setError((err as Error).message);
          setStatus('idle');
        }
      }}
      className="grid gap-4 sm:grid-cols-2"
    >
      {fields.map((f) => (
        <label key={f.name} className={f.wide || f.type === 'textarea' ? 'sm:col-span-2' : undefined}>
          <span className="mb-1 block text-sm font-medium">
            {f.label} {!f.required && <span className="font-normal text-ink-600">(optional)</span>}
          </span>
          {f.type === 'textarea' ? (
            <textarea
              name={f.name}
              rows={5}
              required={f.required}
              placeholder={f.placeholder}
              value={values[f.name] ?? ''}
              onChange={(e) => setValues({ ...values, [f.name]: e.target.value })}
              className={inputCls}
            />
          ) : (
            <input
              name={f.name}
              type={f.type ?? 'text'}
              required={f.required}
              autoComplete={f.autoComplete}
              placeholder={f.placeholder}
              value={values[f.name] ?? ''}
              onChange={(e) => setValues({ ...values, [f.name]: e.target.value })}
              className={inputCls}
            />
          )}
        </label>
      ))}
      {/* Honeypot: hidden from people, filled in by bots. */}
      <input
        type="text"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden
        className="hidden"
        value={values.website ?? ''}
        onChange={(e) => setValues({ ...values, website: e.target.value })}
      />
      {error && (
        <p className="rounded-xl bg-danger-500/10 p-3 text-sm text-danger-500 sm:col-span-2" role="alert">
          {error}
        </p>
      )}
      <div className="sm:col-span-2">
        <button
          type="submit"
          disabled={status === 'sending'}
          className="inline-flex h-12 items-center gap-2 rounded-full bg-cta px-6 font-semibold text-cta-foreground hover:bg-cta-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
        >
          {status === 'sending' && <Loader2 className="size-4 animate-spin" aria-hidden />} {submitLabel}
        </button>
      </div>
    </form>
  );
}
