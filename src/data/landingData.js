export const cuisines = [
  { name: 'Italian', image: 'photo-1473093295043-cdd812d0e601' },
  { name: 'Japanese', image: 'photo-1579871494447-9811cf80d66c' },
  { name: 'Indian', image: 'photo-1585937421612-70a008356fbe' },
  { name: 'Mexican', image: 'photo-1565299624946-b28f40a0ae38' },
  { name: 'Thai', image: 'photo-1559847844-5315695dadae' },
  { name: 'Chinese', image: 'photo-1563245372-f21724e3856d' },
  { name: 'Mediterranean', image: 'photo-1547592180-85f173990554' },
  { name: 'Korean', image: 'photo-1498654896293-37a009fdcdcb' },
];

export const featuredRestaurants = [
  { name: 'Ekaa Restaurant', cuisine: 'Modern Global', location: 'Fort, Mumbai', rating: '4.9', image: 'photo-1517248135467-4c7edcad34c4', badge: 'COMPLIMENTARY DRINK' },
  { name: 'Masque', cuisine: 'Contemporary Indian', location: 'Mahalaxmi, Mumbai', rating: '4.8', image: 'photo-1414235077428-338989a2e8c0' },
  { name: 'Tresind Ragas', cuisine: 'Progressive Indian', location: 'Bandra Kurla Complex, Mumbai', rating: '4.7', image: 'photo-1547592180-85f173990554' },
];

export const nearbyRestaurants = [
  { name: 'Bastian', cuisine: 'Seafood & Asian', location: 'Worli, Mumbai', rating: '4.6', image: 'photo-1559339352-11d035aa65de' },
  { name: 'La Loca', cuisine: 'Mediterranean', location: 'Khar, Mumbai', rating: '4.5', image: 'photo-1514933651103-005eec06c04b' },
  { name: 'O Pedro', cuisine: 'Goan Portuguese', location: 'BKC, Mumbai', rating: '4.7', image: 'photo-1515003197210-e0cd7184f8b5', badge: '15% OFF TABLE' },
];

export const signatureDishes = [
  { name: 'Burra Butter Chicken', restaurant: 'Trending at Tresind Ragas', image: 'photo-1603894584373-5ac82b2ae398' },
  { name: 'A5 Wagyu Katsu Sando', restaurant: 'at Ekaa Restaurant', image: 'photo-1558030006-450675393462' },
  { name: 'Truffle & Forest Mushroom Dim Sum', restaurant: 'at Masque', image: 'photo-1563245372-f21724e3856d' },
];

export const testimonials = [
  { name: 'Ananya Mehta', title: 'Epicure Elite', rating: '5.0', initials: 'AM', quote: 'Secured a weekend table at Masque under 5 minutes. The prime corner they provided made our anniversary dinner absolutely surreal.' },
  { name: 'Devanshu Shah', title: 'Local Guide Level 7', rating: '4.9', initials: 'DS', quote: 'The complimentary welcome cocktails through TableSpot Elite at Ekaa was a stellar touch. Exceptional interface and prompt confirmations.' },
];

export const photo = (id, width = 900) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${width}&q=85`;
