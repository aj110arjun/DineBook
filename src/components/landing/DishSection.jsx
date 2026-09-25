import { photo } from '../../data/landingData.js';
import SectionHeading from './SectionHeading.jsx';

export default function DishSection({ dishes }) {
  return (
    <section className="content-section dish-section" id="dishes">
      <SectionHeading eyebrow="TALK OF THE TOWN" title="Trending Signature Dishes" />
      <div className="dish-grid">{dishes.map(dish => <article className="dish-card" key={dish.name}><div className="dish-image" style={{ backgroundImage: `url(${photo(dish.image, 800)})` }} /><div className="dish-copy"><h3>{dish.name}</h3><p>{dish.restaurant}</p></div></article>)}</div>
    </section>
  );
}
