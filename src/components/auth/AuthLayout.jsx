import { CalendarDays, Utensils } from 'lucide-react';
import { Link } from 'react-router-dom';

const stories = {
  login: {
    tag: 'DINEBOOK FOR GUESTS',
    title: 'Secure Your Table at the World’s Best Bistros',
    body: 'Access vetted tables, book premium dining experiences, and keep every memorable evening in one place.',
  },
  register: {
    tag: 'YOUR NEXT GREAT EVENING',
    title: 'Access the World’s Most Coveted Tables',
    body: 'Create your guest account to discover exceptional restaurants and make every reservation feel effortless.',
  },
  verification: {
    tag: 'ONE LAST STEP',
    title: 'Make Your Account Yours',
    body: 'Confirm your email to secure your profile and keep your dining plans connected to the right inbox.',
  },
  recovery: {
    tag: 'HERE FOR YOU',
    title: 'A Better Evening Starts with Your Account',
    body: 'We’ll help you get back to your DineBook account with a few simple steps.',
  },
  password: {
    tag: 'GUEST ACCOUNT SECURITY',
    title: 'Enhance Your Culinary Profile Security',
    body: 'Keep your account secure with a strong password that protects your dining plans and personal details.',
  },
};

function Brand() {
  return (
    <Link className="inline-flex items-center gap-3 text-xl font-semibold tracking-tight text-white" to="/customer/login" aria-label="DineBook home">
      <span className="grid h-10 w-10 place-items-center rounded-full border border-white/25 bg-white/10 text-gold"><Utensils size={17} /></span>
      <span className="font-display">DineBook</span>
    </Link>
  );
}

export default function AuthLayout({ view, children }) {
  const story = stories[view];

  return (
    <main className="min-h-screen bg-cream font-sans text-ink lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(440px,0.82fr)]">
      <section className="relative flex min-h-[300px] flex-col justify-between overflow-hidden bg-ink px-7 py-8 text-white sm:px-12 sm:py-10 lg:min-h-screen lg:px-[12%] lg:py-12">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,rgba(198,166,107,.2),transparent_55%),linear-gradient(135deg,rgba(87,46,53,.55),transparent_65%)]" />
        <div className="relative z-10">
        <Brand />
        </div>
        <div className="relative z-10 my-12 max-w-xl lg:my-0">
          <span className="text-[11px] font-semibold uppercase tracking-[0.25em] text-gold">{story.tag}</span>
          <h1 className="mt-5 font-display text-4xl leading-tight sm:text-5xl lg:text-[3.4rem]">{story.title}</h1>
          <p className="mt-5 max-w-lg text-sm leading-7 text-white/70 sm:text-base">{story.body}</p>
        </div>
        <footer className="relative z-10 flex items-center gap-2 text-xs text-white/50"><CalendarDays size={14} /><span>© 2026 DineBook Premium Dining Network</span></footer>
      </section>
      <section className="flex items-center justify-center px-6 py-10 sm:px-12 lg:px-16 lg:py-16">
        <div className="w-full max-w-md rounded-2xl bg-white p-7 shadow-[0_20px_70px_rgba(36,23,25,0.08)] sm:p-10">{children}</div>
      </section>
    </main>
  );
}
