export default function SectionHeading({ eyebrow, title, action, centered = false }) {
  return (
    <div className={`section-heading${centered ? ' centered' : ''}`}>
      <div><span className="eyebrow">{eyebrow}</span><h2>{title}</h2></div>
      {action}
    </div>
  );
}
