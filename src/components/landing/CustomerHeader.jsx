import { useState } from 'react';
import { ChevronDown, MapPin, Menu, Utensils, X } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { API_BASE } from '../../lib/authApi.js';
import { demoSessionKey } from '../../data/demoCustomer.js';

export default function CustomerHeader({ user }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();

  async function signOut() {
    if (import.meta.env.DEV && sessionStorage.getItem(demoSessionKey) === 'active') {
      sessionStorage.removeItem(demoSessionKey);
      navigate('/customer/login', { replace: true });
      return;
    }
    try {
      await fetch(`${API_BASE}/api/auth/logout`, { method: 'POST', credentials: 'include' });
    } finally {
      navigate('/customer/login', { replace: true });
    }
  }

  const closeMenu = () => setMenuOpen(false);
  return (
    <header className="site-header">
      <div className="header-inner">
        <Link to="/customer" className="site-brand"><span className="brand-mark"><Utensils size={15} /></span>DineBook</Link>
        <button className="mobile-menu-toggle" aria-label={menuOpen ? 'Close navigation' : 'Open navigation'} onClick={() => setMenuOpen(open => !open)}>{menuOpen ? <X /> : <Menu />}</button>
        <nav className={`main-nav${menuOpen ? ' open' : ''}`} aria-label="Main navigation">
          <label className="location-select"><MapPin size={13} /><select aria-label="Choose location" defaultValue="Mumbai, BKC"><option>Mumbai, BKC</option><option>Mumbai, Fort</option><option>Mumbai, Bandra</option><option>Dubai, DIFC</option></select><ChevronDown size={12} /></label>
          <div className="nav-links"><a href="#discover" onClick={closeMenu}>Discover</a><a href="#featured" onClick={closeMenu}>Restaurants</a><a href="#offers" onClick={closeMenu}>Offers</a><a href="#how-it-works" onClick={closeMenu}>Wallet</a></div>
          <div className="account-nav"><button className="text-button" onClick={signOut}>Sign out</button><button className="profile-button" onClick={() => document.querySelector('#voices')?.scrollIntoView({ behavior: 'smooth' })}>{user?.name?.split(' ')[0] || 'Profile'}</button></div>
        </nav>
      </div>
    </header>
  );
}
