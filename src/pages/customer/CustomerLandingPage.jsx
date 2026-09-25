import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import CustomerHeader from '../../components/landing/CustomerHeader.jsx';
import CuisineGrid from '../../components/landing/CuisineGrid.jsx';
import DishSection from '../../components/landing/DishSection.jsx';
import HeroBanner from '../../components/landing/HeroBanner.jsx';
import HowItWorks from '../../components/landing/HowItWorks.jsx';
import LandingFooter from '../../components/landing/LandingFooter.jsx';
import PromoBanner from '../../components/landing/PromoBanner.jsx';
import RestaurantSection from '../../components/landing/RestaurantSection.jsx';
import Testimonials from '../../components/landing/Testimonials.jsx';
import { featuredRestaurants, nearbyRestaurants, signatureDishes, testimonials } from '../../data/landingData.js';
import { requestJson } from '../../lib/authApi.js';
import { demoCustomer, demoSessionKey } from '../../data/demoCustomer.js';

const cuisineMatches = {
  Italian: ['italian', 'global'],
  Japanese: ['japanese'],
  Indian: ['indian'],
  Mexican: ['mexican'],
  Thai: ['thai'],
  Chinese: ['chinese'],
  Mediterranean: ['mediterranean'],
  Korean: ['korean'],
};

export default function CustomerLandingPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedCuisine, setSelectedCuisine] = useState('');
  const [toast, setToast] = useState('');

  useEffect(() => {
    let mounted = true;
    if (import.meta.env.DEV && sessionStorage.getItem(demoSessionKey) === 'active') {
      setUser(demoCustomer);
      setLoading(false);
      return () => { mounted = false; };
    }
    requestJson('/api/customer/me', { fallbackMessage: 'Please sign in to view your DineBook account.' })
      .then(currentUser => { if (mounted) setUser(currentUser); })
      .catch(() => navigate('/customer/login', { replace: true }))
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, [navigate]);

  const matchingRestaurants = useMemo(() => {
    if (!selectedCuisine) return { featured: featuredRestaurants, nearby: nearbyRestaurants };
    const terms = cuisineMatches[selectedCuisine] || [selectedCuisine.toLowerCase()];
    const matches = restaurant => terms.some(term => `${restaurant.cuisine} ${restaurant.name}`.toLowerCase().includes(term));
    return { featured: featuredRestaurants.filter(matches), nearby: nearbyRestaurants.filter(matches) };
  }, [selectedCuisine]);

  function notifyReservation(restaurant) {
    setToast(`Table reservations at ${restaurant.name} are coming soon.`);
    window.setTimeout(() => setToast(''), 3600);
  }

  if (loading) return <main className="landing-loading"><span className="loading-mark">D</span><p>Setting your table…</p></main>;

  return (
    <div className="customer-home">
      <CustomerHeader user={user} />
      <HeroBanner />
      <main>
        <CuisineGrid selected={selectedCuisine} onSelect={setSelectedCuisine} />
        <RestaurantSection id="featured" eyebrow="CRITICALLY ACCLAIMED" title="Featured Restaurants" restaurants={matchingRestaurants.featured} onReserve={notifyReservation} actionLabel="View All Featured" actionHref="#restaurants-near-you" />
        <RestaurantSection id="restaurants-near-you" eyebrow="WITHIN YOUR REACH" title="Restaurants Near You" restaurants={matchingRestaurants.nearby} onReserve={notifyReservation} actionLabel="Explore Nearby" actionHref="#restaurants-near-you" />
        <DishSection dishes={signatureDishes} />
        <PromoBanner />
        <HowItWorks />
        <Testimonials testimonials={testimonials} />
      </main>
      <LandingFooter />
      {toast && <div className="landing-toast" role="status">{toast}</div>}
    </div>
  );
}
