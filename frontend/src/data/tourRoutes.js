// Tour Van route options, display details, and booking prices shown on the site.
export const TOUR_ROUTES = [
  {
    id: "mayon", status: "available", statusClass: "ok", statusText: "Available",
    title: "Mayon Highlights Loop", label: "Available for booking", duration: "8 hours", price: "PHP 6,200",
    best: "Best for first-time tourists", copy: "Full-day scenic route around Legazpi and Daraga.",
    summary: "A relaxed day trip with classic Mayon photo spots and easy food stops.",
    stops: ["Cagsawa Ruins", "Sumlang Lake", "Mayon Skyline View", "Daraga Church"],
    tips: ["Best for families and visitors.", "Morning departure is recommended.", "Can include a dinner stop in Legazpi."],
    image: "cagsawa-ruins-park.jpg",
    route: "Cagsawa Ruins, Sumlang Lake, Mayon Skyline View, Daraga Church.",
  },
  {
    id: "heritage", status: "available", statusClass: "ok", statusText: "Available",
    title: "Legazpi Heritage and View Deck Tour", label: "Open this week", duration: "6 hours", price: "PHP 5,800",
    best: "Best for short city tours", copy: "Half-day city route with culture and food stops.",
    summary: "A lighter city tour for guests staying in Legazpi who want scenic and heritage stops.",
    stops: ["Lignon Hill", "Albay Cathedral area", "FarmPlate", "Legazpi Boulevard"],
    tips: ["Good for airport pick-up plus same-day tour.", "Senior-friendly pacing works well here.", "Sunset boulevard stop may be added."],
    image: "lignon_hill.jpg",
    route: "Lignon Hill, cathedral area, FarmPlate, Legazpi Boulevard.",
  },
  {
    id: "donsol", status: "limited", statusClass: "warn", statusText: "Limited",
    title: "Donsol Nature Escape", label: "Seasonal availability", duration: "10 hours", price: "PHP 7,400",
    best: "Best during whale shark season", copy: "Long day trip with eco-tour transfer points.",
    summary: "This is a longer route and works best when seasonal activities are open.",
    stops: ["Donsol Visitor Center", "Whale Shark Briefing Area", "Firefly Tour point", "Seafood lunch stop"],
    tips: ["Advance confirmation is needed.", "Early departure is required.", "Ideal for smaller groups."],
    image: "Donsol20Sorsogon.jpg",
    route: "Donsol visitor area, eco-tour stops, lunch, optional firefly transfer point.",
  },
  {
    id: "sorsogon", status: "available", statusClass: "ok", statusText: "Available",
    title: "Sorsogon Heritage Day Trip", label: "Open for private groups", duration: "9 hours", price: "PHP 7,000",
    best: "Best for history and food trips", copy: "Southbound route with heritage and pasalubong stops.",
    summary: "A private van trip for guests who want churches, bay views, and local delicacies.",
    stops: ["Barcelona Church", "Sorsogon city center", "Bacon seaside stop", "Pasalubong center"],
    tips: ["Great for balikbayan families.", "Dinner stop can be added.", "Flexible timing for private groups."],
    image: "Sorsogon.jpg",
    route: "Barcelona Church, city center, coastal stop, pasalubong hub.",
  },
  {
    id: "caramoan", status: "unavailable", statusClass: "off", statusText: "Unavailable",
    title: "Caramoan Transfer and Island Tour", label: "Currently unavailable", duration: "2 days", price: "Custom quote",
    best: "Boat coordination needed", copy: "Paused route because sea transfer coordination is not active.",
    summary: "Keep this visible if you want tourists to see future package options even while paused.",
    stops: ["Legazpi to port transfer", "Boat coordination point", "Accommodation drop-off", "Island hopping add-on"],
    tips: ["Better as a custom package.", "Needs boat partner scheduling.", "Can be re-opened later."],
    image: "caramoan_island.jpg",
    route: "Land transfer to port plus coordinated island package.",
  },
  {
    id: "masbate", status: "unavailable", statusClass: "off", statusText: "Unavailable",
    title: "Masbate Rodeo Extension", label: "Not available this month", duration: "Custom", price: "Event package",
    best: "Festival-based route", copy: "Special event route for selected dates only.",
    summary: "You can keep special event tours visible on the page even when not currently bookable.",
    stops: ["Airport or port transfer", "Festival grounds", "Hotel transfers", "Return transfer"],
    tips: ["Enable during festival season.", "Needs custom pricing.", "Good for future promotion."],
    image: "masbate.jpg",
    route: "Event transfer package for festival guests and group reservations.",
  },
];

// Short descriptions displayed for route stops in the Tour Van route board.
export const STOP_NOTES = [
  "Photo stop and Mayon view.",
  "Scenic rest and food break.",
  "Panoramic sightseeing stop.",
  "Cultural stop before return.",
];

// Route names accepted by the Tour Van reservation form.
export const ROUTE_OPTIONS = [
  "Mayon Highlights Loop",
  "Legazpi Heritage and View Deck Tour",
  "Donsol Nature Escape",
  "Sorsogon Heritage Day Trip",
  "Custom Bicol itinerary",
];
