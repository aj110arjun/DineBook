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
    <Link className="brand" to="/customer/login" aria-label="DineBook home">
      <span className="brand-mark"><Utensils size={16} /></span>
      <span>DineBook</span>
    </Link>
  );
}

export default function AuthLayout({ view, children }) {
  const story = stories[view];

  return (
    <main className="auth-shell">
      <section className="story">
        <Brand />
        <div className="story-copy">
          <span className="eyebrow">{story.tag}</span>
          <h1>{story.title}</h1>
          <p>{story.body}</p>
        </div>
        <footer><CalendarDays size={13} /><span>© 2026 DineBook Premium Dining Network</span></footer>
      </section>
      <section className="form-side">
        <div className="form-wrap">{children}</div>
      </section>
    </main>
  );
}
