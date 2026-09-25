import { cuisines, photo } from '../../data/landingData.js';
import SectionHeading from './SectionHeading.jsx';

export default function CuisineGrid({ selected, onSelect }) {
  return (
    <section className="content-section cuisine-section" id="cuisines">
      <SectionHeading eyebrow="CURATED FLAVORS" title="Popular Cuisines" />
      <div className="cuisine-grid">{cuisines.map(cuisine => <button className={`cuisine-card${selected === cuisine.name ? ' selected' : ''}`} key={cuisine.name} onClick={() => onSelect(selected === cuisine.name ? '' : cuisine.name)} style={{ backgroundImage: `linear-gradient(90deg,rgba(37,19,18,.68),rgba(37,19,18,.08)),url(${photo(cuisine.image, 360)})` }}><span>{cuisine.name}</span></button>)}</div>
    </section>
  );
}
