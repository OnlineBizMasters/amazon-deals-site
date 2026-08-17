export type Category =
  | "Electronics"
  | "Home & Kitchen"
  | "Beauty"
  | "Toys & Games"
  | "Sports & Outdoors"
  | "Books";

export interface Product {
  id: string;
  asin: string;
  title: string;
  category: Category;
  price: number;
  listPrice: number;
  rating: number;
  reviews: number;
  emoji: string;
  gradient: string;
  blurb: string;
  features: string[];
  prime: boolean;
}

export const CATEGORIES: Category[] = [
  "Electronics",
  "Home & Kitchen",
  "Beauty",
  "Toys & Games",
  "Sports & Outdoors",
  "Books",
];

export type SortKey = "discount" | "price-asc" | "price-desc" | "rating";

export const PRODUCTS: Product[] = [
  {
    id: "wireless-anc-headphones",
    asin: "B0ANC12345",
    title: "AuroraSound Wireless Noise-Cancelling Headphones",
    category: "Electronics",
    price: 129.99,
    listPrice: 249.99,
    rating: 4.6,
    reviews: 18432,
    emoji: "🎧",
    gradient: "from-indigo-500 to-sky-400",
    blurb: "40-hour battery, adaptive ANC, and plush memory-foam ear cups.",
    features: [
      "Adaptive active noise cancellation",
      "40-hour battery life on a single charge",
      "Bluetooth 5.3 multipoint pairing",
      "USB-C fast charge: 10 min = 5 hours",
    ],
    prime: true,
  },
  {
    id: "smart-4k-streaming-stick",
    asin: "B04KSTICK9",
    title: "BeamCast 4K Streaming Stick with Voice Remote",
    category: "Electronics",
    price: 27.99,
    listPrice: 49.99,
    rating: 4.5,
    reviews: 92310,
    emoji: "📺",
    gradient: "from-violet-600 to-fuchsia-500",
    blurb: "Stream 4K HDR in every room with hands-free voice search.",
    features: [
      "4K Ultra HD + Dolby Vision",
      "Voice remote with TV power & volume",
      "Wi-Fi 6 for smoother streaming",
    ],
    prime: true,
  },
  {
    id: "espresso-machine",
    asin: "B0ESPRESSO",
    title: "CremaPro 15-Bar Espresso & Cappuccino Machine",
    category: "Home & Kitchen",
    price: 179.0,
    listPrice: 299.0,
    rating: 4.7,
    reviews: 5421,
    emoji: "☕",
    gradient: "from-amber-600 to-orange-400",
    blurb: "Cafe-quality espresso and coffee at home with a pro steam wand.",
    features: [
      "15-bar Italian pressure pump",
      "Built-in milk frother for lattes & cappuccinos",
      "Brews espresso, coffee, and specialty drinks",
      "Removable 58oz water reservoir",
    ],
    prime: true,
  },
  {
    id: "air-fryer-6qt",
    asin: "B0AIRFRY6Q",
    title: "CrispWave 6-Quart Digital Air Fryer",
    category: "Home & Kitchen",
    price: 59.99,
    listPrice: 119.99,
    rating: 4.8,
    reviews: 73211,
    emoji: "🍟",
    gradient: "from-rose-500 to-orange-400",
    blurb: "Guilt-free fries with 8 one-touch cooking presets.",
    features: [
      "6-quart family-size basket",
      "8 smart presets + shake reminder",
      "Dishwasher-safe nonstick basket",
    ],
    prime: true,
  },
  {
    id: "vitamin-c-serum",
    asin: "B0VITCSERM",
    title: "GlowLab Vitamin C Brightening Serum",
    category: "Beauty",
    price: 14.95,
    listPrice: 29.95,
    rating: 4.4,
    reviews: 40122,
    emoji: "🧴",
    gradient: "from-amber-400 to-yellow-300",
    blurb: "20% Vitamin C + hyaluronic acid for a radiant complexion.",
    features: [
      "20% Vitamin C with vitamin E",
      "Hyaluronic acid for hydration",
      "Cruelty-free & paraben-free",
    ],
    prime: false,
  },
  {
    id: "electric-toothbrush",
    asin: "B0SONICTB1",
    title: "PearlSonic Rechargeable Electric Toothbrush",
    category: "Beauty",
    price: 34.99,
    listPrice: 69.99,
    rating: 4.6,
    reviews: 28744,
    emoji: "🪥",
    gradient: "from-teal-400 to-cyan-300",
    blurb: "Sonic cleaning with 5 modes and a 30-day battery.",
    features: [
      "40,000 sonic vibrations per minute",
      "5 brushing modes + smart timer",
      "30-day battery on one charge",
    ],
    prime: true,
  },
  {
    id: "building-blocks-set",
    asin: "B0BLOCKS99",
    title: "BrickMasters 1,000-Piece Creative Building Set",
    category: "Toys & Games",
    price: 39.99,
    listPrice: 79.99,
    rating: 4.9,
    reviews: 15230,
    emoji: "🧱",
    gradient: "from-red-500 to-amber-400",
    blurb: "1,000 compatible bricks to spark endless imagination.",
    features: [
      "1,000 pieces in 12 vivid colors",
      "Compatible with major brick brands",
      "Reusable storage tub included",
    ],
    prime: true,
  },
  {
    id: "board-game-night",
    asin: "B0BOARDGME",
    title: "Quest Legends Cooperative Board Game",
    category: "Toys & Games",
    price: 24.49,
    listPrice: 44.99,
    rating: 4.7,
    reviews: 8890,
    emoji: "🎲",
    gradient: "from-emerald-500 to-lime-400",
    blurb: "Team up for 2-5 player campaigns of tactical adventure.",
    features: [
      "2-5 players, ages 10+",
      "60-90 minute cooperative campaigns",
      "Over 120 illustrated quest cards",
    ],
    prime: true,
  },
  {
    id: "running-shoes",
    asin: "B0RUNSHOE7",
    title: "TrailGlide Lightweight Running Shoes",
    category: "Sports & Outdoors",
    price: 54.99,
    listPrice: 99.99,
    rating: 4.5,
    reviews: 33012,
    emoji: "👟",
    gradient: "from-blue-600 to-cyan-400",
    blurb: "Responsive cushioning built for road and trail miles.",
    features: [
      "Breathable engineered knit upper",
      "Energy-return foam midsole",
      "Grippy all-terrain rubber outsole",
    ],
    prime: true,
  },
  {
    id: "insulated-water-bottle",
    asin: "B0HYDRO32Z",
    title: "SummitFlask 32oz Insulated Water Bottle",
    category: "Sports & Outdoors",
    price: 19.99,
    listPrice: 34.99,
    rating: 4.8,
    reviews: 61233,
    emoji: "🧊",
    gradient: "from-sky-500 to-emerald-400",
    blurb: "Ice-cold for 24 hours, hot for 12 — leakproof guarantee.",
    features: [
      "Double-wall vacuum insulation",
      "Cold 24h / hot 12h",
      "Leakproof flip-straw lid",
    ],
    prime: true,
  },
  {
    id: "productivity-book",
    asin: "B0FOCUSBK1",
    title: "Deep Focus: The Science of Getting Things Done",
    category: "Books",
    price: 12.99,
    listPrice: 24.0,
    rating: 4.6,
    reviews: 20455,
    emoji: "📘",
    gradient: "from-slate-600 to-indigo-400",
    blurb: "A practical playbook for reclaiming your attention.",
    features: [
      "New York Times bestseller",
      "12 actionable focus frameworks",
      "Available in paperback & Kindle",
    ],
    prime: false,
  },
  {
    id: "cookbook-weeknight",
    asin: "B0COOK30MN",
    title: "30-Minute Weeknight Dinners Cookbook",
    category: "Books",
    price: 9.99,
    listPrice: 21.99,
    rating: 4.7,
    reviews: 11902,
    emoji: "📗",
    gradient: "from-green-600 to-emerald-400",
    blurb: "125 fast, family-friendly recipes for busy nights.",
    features: [
      "125 recipes, all under 30 minutes",
      "Full-color photos for every dish",
      "Pantry-friendly ingredient lists",
    ],
    prime: false,
  },
  {
    id: "mechanical-keyboard",
    asin: "B0MECHKB77",
    title: "TypeForge Hot-Swappable Mechanical Keyboard",
    category: "Electronics",
    price: 69.99,
    listPrice: 129.99,
    rating: 4.6,
    reviews: 9821,
    emoji: "⌨️",
    gradient: "from-purple-600 to-indigo-400",
    blurb: "Tactile switches, RGB, and hot-swap sockets for tinkerers.",
    features: [
      "Hot-swappable tactile switches",
      "Per-key RGB backlighting",
      "USB-C + 2.4GHz + Bluetooth",
    ],
    prime: true,
  },
  {
    id: "robot-vacuum",
    asin: "B0ROBOVAC5",
    title: "TidyBot Self-Emptying Robot Vacuum",
    category: "Home & Kitchen",
    price: 219.0,
    listPrice: 399.0,
    rating: 4.5,
    reviews: 27540,
    emoji: "🤖",
    gradient: "from-zinc-600 to-slate-400",
    blurb: "LiDAR mapping and a 60-day self-emptying base.",
    features: [
      "Precision LiDAR room mapping",
      "60-day self-emptying dust base",
      "App + voice assistant control",
    ],
    prime: true,
  },
  {
    id: "yoga-mat",
    asin: "B0YOGAMAT4",
    title: "ZenGrip Extra-Thick Non-Slip Yoga Mat",
    category: "Sports & Outdoors",
    price: 22.99,
    listPrice: 42.99,
    rating: 4.7,
    reviews: 18320,
    emoji: "🧘",
    gradient: "from-pink-500 to-rose-400",
    blurb: "Cushioned 8mm support with a carry strap included.",
    features: [
      "Extra-thick 8mm cushioning",
      "Double-sided non-slip texture",
      "Carry strap + eco-friendly TPE",
    ],
    prime: true,
  },
  {
    id: "led-face-mask",
    asin: "B0LEDMASK2",
    title: "LumaGlow LED Light Therapy Face Mask",
    category: "Beauty",
    price: 49.99,
    listPrice: 109.99,
    rating: 4.3,
    reviews: 6120,
    emoji: "💡",
    gradient: "from-fuchsia-500 to-pink-400",
    blurb: "7 light modes for spa-grade skincare at home.",
    features: [
      "7 clinically-inspired light modes",
      "Rechargeable, cordless design",
      "Comfortable adjustable fit",
    ],
    prime: false,
  },
];

export function discountPercent(product: Pick<Product, "price" | "listPrice">): number {
  if (product.listPrice <= 0) return 0;
  return Math.round(((product.listPrice - product.price) / product.listPrice) * 100);
}

export function formatPrice(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value);
}

/**
 * Builds an Amazon product URL carrying the site's affiliate tag. The tag is
 * read from AMAZON_AFFILIATE_TAG so it can be swapped per environment without
 * code changes; the fallback keeps local/dev links working out of the box.
 */
export function affiliateUrl(asin: string): string {
  const tag = process.env.AMAZON_AFFILIATE_TAG?.trim() || "dealsforus-20";
  return `https://www.amazon.com/dp/${asin}/?tag=${encodeURIComponent(tag)}`;
}

export interface ProductQuery {
  q?: string;
  category?: string;
  sort?: SortKey;
  minDiscount?: number;
}

export function queryProducts(options: ProductQuery = {}): Product[] {
  const { q, category, sort = "discount", minDiscount = 0 } = options;

  let results = [...PRODUCTS];

  if (category && category !== "All") {
    results = results.filter((p) => p.category === category);
  }

  if (q && q.trim()) {
    const needle = q.trim().toLowerCase();
    results = results.filter((p) =>
      [p.title, p.blurb, p.category, ...p.features]
        .join(" ")
        .toLowerCase()
        .includes(needle),
    );
  }

  if (minDiscount > 0) {
    results = results.filter((p) => discountPercent(p) >= minDiscount);
  }

  results.sort((a, b) => {
    switch (sort) {
      case "price-asc":
        return a.price - b.price;
      case "price-desc":
        return b.price - a.price;
      case "rating":
        return b.rating - a.rating;
      case "discount":
      default:
        return discountPercent(b) - discountPercent(a);
    }
  });

  return results;
}

export function getProductById(id: string): Product | undefined {
  return PRODUCTS.find((p) => p.id === id);
}

export function relatedProducts(product: Product, limit = 3): Product[] {
  return PRODUCTS.filter(
    (p) => p.category === product.category && p.id !== product.id,
  ).slice(0, limit);
}
