// Frontend-only vehicle photos, specifications, and catalog category definitions.
// The `vehicles` table stores name / type / category / price / status / image (uploaded photo).
// Spec chips and the photos of the original fleet were hard-coded in the old book.php,
// so they live here, keyed by the vehicle name stored in the database.
const img = (file) => encodeURI(`/needs/${file}`);

export const VEHICLE_META = {
  "Mercedes-Benz C-Class": { image: "mercedes.jpg", seats: "2 seats | Gasoline", specs: ["2.0L Turbo", "Automatic", "Premium Sedan"], deal: true },
  "Mitsubishi Montero Sport 2025": { image: "MONTERO SPORT-Picsart-AiImageEnhancer.jpg", seats: "7 seats | Gasoline", specs: ["2.4L Diesel", "Automatic", "4x2 SUV"] },
  "Kawasaki Ninja 400": { image: "ninja.jpg", seats: "2 seats | Gasoline", specs: ["399cc", "6-Speed", "Sport Bike"] },
  "Jaguar F-Type Coupe": { image: "Jaguar F-Type Coupe-Picsart-AiImageEnhancer.jpg", seats: "2 seats | Gasoline", specs: ["5.0L V8", "Automatic", "Coupe"], deal: true },
  "2013 BMW M6 Coupe": { image: "2013 BMW M6 Coupe-Picsart-AiImageEnhancer.jpg", seats: "4 seats | Gasoline", specs: ["4.4L V8", "Automatic", "Grand Coupe"] },
  "2025 Mini Cooper": { image: "Mini Cooper_ The Iconic Car That Never Goes Out of Style _ 2025 Mini Cooper-Picsart-AiImageEnhancer.jpg", seats: "4 seats | Gasoline", specs: ["1.5L Turbo", "Automatic", "City Hatch"] },
  "2022 Toyota Land Cruiser": { image: "2022 Toyota Land Cruiser _ Cool Material-Picsart-AiImageEnhancer.jpg", seats: "7 seats | Gasoline", specs: ["3.3L V6", "4WD", "Luxury SUV"], deal: true },
  "Audi Q3 Sportback (2020)": { image: "Audi Q3 Sportback (2020)-Picsart-AiImageEnhancer.jpg", seats: "6 seats | Gasoline", specs: ["1.4L Turbo", "Automatic", "Compact SUV"] },
  "Hyundai Palisade": { image: "Hyundai Palisade-Picsart-AiImageEnhancer.jpg", seats: "6 seats | Gasoline", specs: ["3.8L V6", "Automatic", "Family SUV"] },
  "2025 NISSAN PATHFINDER": { image: "2025 NISSAN PATHFINDER CONCEPT - INEAX MOTORS-Picsart-AiImageEnhancer.jpg", seats: "7 seats | Gasoline", specs: ["3.5L V6", "Automatic", "7-Seater"], deal: true },
  "Range Rover Chieftain": { image: "Range Rover Chieftain Is A Classic Reborn With A Cadillac CTS-V Supercharged V8 _ Carscoops-Picsart-AiImageEnhancer.jpg", seats: "6 seats | Gasoline", specs: ["6.2L V8", "AWD", "Luxury SUV"] },
  "Toyota Innova": { image: "innova.jpg", seats: "6 seats | Gasoline", specs: ["2.8L Diesel", "Automatic", "MPV"] },
  "Nissan GT-R (R35)": { image: "Nissan GT-R (R35)-Picsart-AiImageEnhancer.jpg", seats: "4 seats | Gasoline", specs: ["3.8L Twin Turbo", "AWD", "Supercar"], deal: true },
  "Porsche 992 GT3 Touring 2022": { image: "Zu Verkaufen_ Porsche 992 GT3 Touring 2022 - elferspot_com-Picsart-AiImageEnhancer.jpg", seats: "4 seats | Gasoline", specs: ["4.0L Flat-6", "PDK", "Track Coupe"] },
  "Lamborghini Revuelto": { image: "lamborghini-revuelto.jpg", seats: "4 seats | Gasoline", specs: ["6.5L V12 Hybrid", "AWD", "Exotic"] },
  "Yamaha Sniper 155": { image: "yamaha-sniper-155.jpg", seats: "2 seats | Gasoline", specs: ["155cc", "6-Speed", "Underbone"], deal: true },
  "Royal Enfield": { image: "download-Picsart-AiImageEnhancer.jpg", seats: "2 seats | Gasoline", specs: ["350cc", "5-Speed", "Cruiser"] },
};

const FALLBACK = { image: "background.jpg", seats: "Details on request", specs: [], deal: false };

/**
 * Merge a DB row with its display metadata.
 * Photo order: 1) the photo the admin uploaded, 2) the built-in photo for the original fleet, 3) a default photo.
 */
export function withMeta(vehicle) {
  const meta = VEHICLE_META[vehicle.name] || FALLBACK;
  return {
    ...vehicle,
    imageUrl: vehicle.image ? `/${vehicle.image}` : img(meta.image),
    seats: meta.seats,
    specs: meta.specs,
    deal: !!meta.deal,
  };
}

// Category tabs on the Vehicles page (same order / hero photos as the PHP version).
export const CATEGORY_TABS = [
  { key: "featured", label: "Featured", icon: "star.png", hero: "featured-Picsart-AiImageEnhancer.jpg", match: (v) => v.category === "Featured" },
  { key: "coupe", label: "Coupe", icon: "coupeicon.png", hero: "coupe-Picsart-AiImageEnhancer.jpg", match: (v) => v.category === "Coupe" },
  { key: "suv", label: "SUV", icon: "suvicon.png", hero: "SUV-Picsart-AiImageEnhancer.jpg", match: (v) => v.category === "SUV" },
  { key: "family", label: "Family Car", icon: "fam icon.png", hero: "family-Picsart-AiImageEnhancer.jpg", match: (v) => v.category === "Family Car" },
  { key: "sports", label: "Sports Car", icon: "sports icon.png", hero: "sports-Picsart-AiImageEnhancer.jpg", match: (v) => v.category === "Sports Car" },
  { key: "bikes", label: "Bikes", icon: "bike icon.png", hero: "bikes-Picsart-AiImageEnhancer.jpg", match: (v) => v.type === "Bike" },
];

export const needsUrl = img;
