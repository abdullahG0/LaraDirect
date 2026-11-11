import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getAdminUser } from '@/lib/auth/admin';
import { LoginForm } from './login-form';

export const metadata: Metadata = { title: 'Sign in' };
export const dynamic = 'force-dynamic';

export default async function AdminLoginPage({ searchParams }: { searchParams: { next?: string } }) {
  const next = searchParams.next?.startsWith('/admin') ? searchParams.next : '/admin';
  if (await getAdminUser()) redirect(next);
  return (
    <div className="grid min-h-screen place-items-center bg-[#0E1E3E] px-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 text-slate-900 shadow-xl">
        <div className="mb-6 flex items-center gap-2">
          <span className="grid size-9 place-items-center rounded-lg bg-[#0E1E3E] text-sm font-bold text-[#22D3EE]">
            LD
          </span>
          <div>
            <h1 className="text-lg font-semibold leading-tight">LaraDirect admin</h1>
            <p className="text-sm text-slate-600">Sign in to continue</p>
          </div>
        </div>
        <LoginForm next={next} demo={process.env.NEXT_PUBLIC_DEMO_MODE === 'true'} />
      </div>
    </div>
  );
}
