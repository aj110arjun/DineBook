import { Instagram, Utensils } from 'lucide-react';
import { Link } from 'react-router-dom';

const columns = [
  { heading: 'Company', links: ['About Us', 'Press & Media', 'Careers', 'Culinary Board'] },
  { heading: 'Support', links: ['Help Center', 'Reservation Policy', 'For Restaurants', 'Security'] },
  { heading: 'Cuisines', links: ['Modern Indian', 'Contemporary Japanese', 'Neapolitan Italian', 'Nordic Minimalist'] },
  { heading: 'Cities', links: ['Mumbai', 'Delhi NCR', 'Bengaluru', 'Goa'] },
];

export default function LandingFooter() {
  return (
    <footer className="site-footer">
      <div className="footer-main"><div className="footer-brand"><Link to="/customer" className="site-brand"><span className="brand-mark"><Utensils size={15} /></span>DineBook</Link><p>Reserve prime seats at handpicked destinations. Micro-brews, high-concept dining, and more.</p><div className="social-links"><a href="#instagram" aria-label="Instagram"><Instagram size={14} /></a><a href="#social-x" aria-label="Social feed">𝕏</a><a href="#facebook" aria-label="Facebook">f</a></div></div>{columns.map(column => <div className="footer-column" key={column.heading}><h3>{column.heading}</h3>{column.links.map(link => <a href="#footer" key={link}>{link}</a>)}</div>)}</div>
      <div className="footer-bottom"><span>© 2026 DineBook Technologies Pvt. Ltd. All rights reserved.</span><span><a href="#privacy">Privacy Policy</a><a href="#terms">Terms of Service</a></span></div>
    </footer>
  );
}
