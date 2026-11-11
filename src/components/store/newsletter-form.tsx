'use client';

import { useState } from 'react';
import { toast } from 'sonner';

// Demo only: nothing is stored or sent. Spec §10.6 lists the newsletter as a placeholder.
export function NewsletterForm({ tone = 'dark' }: { tone?: 'dark' | 'light' }) {
  const [email, setEmail] = useState('');
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      toast.error('Please enter a valid email address');
      return;
    }
    setEmail('');
    toast.success('Thanks for signing up', { description: 'Demo: no email has been stored.' });
  };
  return (
    <form onSubmit={submit} className="flex max-w-sm gap-2">
      <label htmlFor={`newsletter-${tone}`} className="sr-only">
        Email address
      </label>
      <input
        id={`newsletter-${tone}`}
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@school.org.uk"
        className={
          tone === 'dark'
            ? 'h-10 min-w-0 flex-1 rounded-lg border border-white/20 bg-white/10 px-3 text-sm text-white placeholder:text-white/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cta'
            : 'h-11 min-w-0 flex-1 rounded-lg border border-input bg-white px-3 text-sm text-ink-900 placeholder:text-ink-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
        }
      />
      <button
        type="submit"
        className="h-10 shrink-0 rounded-lg bg-cta px-4 text-sm font-semibold text-cta-foreground hover:bg-cta-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-brand-900 data-[tone=light]:h-11"
        data-tone={tone}
      >
        Sign up
      </button>
    </form>
  );
}
