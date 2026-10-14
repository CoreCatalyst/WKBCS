export interface MarketplaceCategory {
  id: string;
  name: string;
  slug: string;
  description: string;
  iconName: string;
  listingCount: number;
}

export const MARKETPLACE_CATEGORIES: MarketplaceCategory[] = [
  { id: "cat-1", name: "Electronics", slug: "electronics", description: "Industrial electronics, components, chips & consumer appliances", iconName: "Cpu", listingCount: 1420 },
  { id: "cat-2", name: "Food & Grocery", slug: "food-grocery", description: "Agri-produce, packaged foods, spices & bulk commodities", iconName: "Apple", listingCount: 980 },
  { id: "cat-3", name: "Fashion", slug: "fashion", description: "Textiles, apparel, footwear & traditional craftsmanship", iconName: "Shirt", listingCount: 2150 },
  { id: "cat-4", name: "Home Services", slug: "home-services", description: "Plumbing, electrical, deep cleaning & repair experts", iconName: "Home", listingCount: 640 },
  { id: "cat-5", name: "Professional Services", slug: "professional-services", description: "Chartered accountants, legal, IT & marketing consultants", iconName: "Briefcase", listingCount: 810 },
  { id: "cat-6", name: "Construction", slug: "construction", description: "Cement, steel, tiles, hardware & contracting services", iconName: "HardHat", listingCount: 1120 },
  { id: "cat-7", name: "Real Estate", slug: "real-estate", description: "Commercial spaces, industrial warehouses & retail properties", iconName: "Building2", listingCount: 430 },
  { id: "cat-8", name: "Automotive", slug: "automotive", description: "OEM spare parts, lubricants, battery & fleet maintenance", iconName: "Car", listingCount: 790 },
  { id: "cat-9", name: "Manufacturing", slug: "manufacturing", description: "Heavy machinery, CNC fabrication & custom tooling", iconName: "Factory", listingCount: 1680 },
  { id: "cat-10", name: "Education", slug: "education", description: "Vocational coaching, corporate skilling & school supplies", iconName: "GraduationCap", listingCount: 390 },
  { id: "cat-11", name: "Healthcare Services", slug: "healthcare-services", description: "Diagnostic gear, medical consumables & clinic support", iconName: "Stethoscope", listingCount: 520 },
  { id: "cat-12", name: "Other", slug: "other", description: "Packaging, specialized crafts & miscellaneous commerce", iconName: "Boxes", listingCount: 340 }
];

export const BUSINESS_TYPES = [
  "Manufacturer",
  "Retailer",
  "Wholesaler",
  "Distributor",
  "Service Provider",
  "Shop",
  "Freelancer",
  "Other"
] as const;

export type BusinessType = typeof BUSINESS_TYPES[number];

export interface BusinessProfile {
  id: string;
  name: string;
  tradeName?: string;
  ownerName: string;
  businessType: BusinessType;
  category: string;
  description: string;
  logo: string;
  coverImage?: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  district: string;
  state: string;
  country: string;
  pinCode: string;
  lat: number;
  lng: number;
  gstNumber?: string;
  gstStatus: "Registered" | "Not Registered" | "Composition Scheme" | "Exempted";
  udyamRegistration?: string;
  panNumber?: string;
  isVerified: boolean;
  verificationBadgeGranted: boolean;
  verificationNotes?: string;
  rating: number;
  reviewsCount: number;
  totalTransactions: number;
  joinedYear: number;
  verifiedAt?: string;
}

export interface ListingItem {
  id: string;
  type: "Product" | "Service";
  title: string;
  shortDescription: string;
  detailedDescription: string;
  keyFeatures: string[];
  category: string;
  subcategory?: string;
  price: number;
  unit: string;
  availability: "In Stock" | "Available on Order" | "Active" | "Temporarily Unavailable";
  images: string[];
  videos?: string[];
  primaryImageIndex: number;
  keywords: string[];
  specifications: Record<string, string>;
  businessId: string;
  businessName: string;
  businessType?: string;
  businessCity: string;
  businessState: string;
  businessVerified: boolean;
  status: "Draft" | "Pending Review" | "Published" | "Inactive";
  views: number;
  orders: number;
  moq?: number;
  createdAt: string;
}

export interface TransactionRecord {
  id: string;
  date: string;
  orderId: string;
  customerName: string;
  listingId: string;
  itemTitle: string;
  businessId: string;
  businessName: string;
  grossAmount: number;
  platformFeeRate: number; // Category fee decimal: Wholesaler 0.032 (3.20%), Distributor/Services 0.052 (5.20%), Retailer 0.082 (8.20%)
  platformFeeAmount: number;
  gstOnFeeAmount: number; // 18% on platform fee
  otherCharges: number;
  netSettlement: number;
  status: "Successful" | "Pending" | "Refunded" | "Cancelled" | "Failed";
  paymentMethod: string;
}

// Initial Sample Businesses
export const INITIAL_BUSINESSES: BusinessProfile[] = [
  {
    id: "biz-1",
    name: "Apex Precision Instruments Pvt. Ltd.",
    tradeName: "Apex Instruments",
    ownerName: "Rajeshwar Rao",
    businessType: "Manufacturer",
    category: "Manufacturing",
    description: "Pioneering high-precision industrial robotics, continuous duty servo motors, and automated manufacturing systems with ISO 9001:2015 certification.",
    logo: "https://images.unsplash.com/photo-1560179707-f14e90ef3623?auto=format&fit=crop&w=200&h=200&q=80",
    coverImage: "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&w=1200&q=80",
    email: "contact@apexinstruments.in",
    phone: "+91 98450 12345",
    address: "Plot 42, Electronic City Phase 1",
    city: "Bengaluru",
    district: "Bengaluru Urban",
    state: "Karnataka",
    country: "India",
    pinCode: "560100",
    lat: 12.8399,
    lng: 77.6770,
    gstNumber: "29AABCA1234F1Z5",
    gstStatus: "Registered",
    udyamRegistration: "UDYAM-KA-09-0045231",
    panNumber: "AABCA1234F",
    isVerified: true,
    verificationBadgeGranted: true,
    verificationNotes: "GSTIN verified with live tax portal and verified factory premises.",
    rating: 4.8,
    reviewsCount: 142,
    totalTransactions: 560,
    joinedYear: 2022,
    verifiedAt: "2023-01-15"
  },
  {
    id: "biz-2",
    name: "Kaveri Organic Agro Hub",
    tradeName: "Kaveri Organics",
    ownerName: "Saraswathi Narayanan",
    businessType: "Wholesaler",
    category: "Food & Grocery",
    description: "Direct farm-to-table organic spices, heirloom grains, virgin coconut oil, and dry fruit bulk supplier certified under NPOP organic standards.",
    logo: "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=200&h=200&q=80",
    coverImage: "https://images.unsplash.com/photo-1500937386664-56d1dfef3854?auto=format&fit=crop&w=1200&q=80",
    email: "orders@kaveriorganics.in",
    phone: "+91 97890 23456",
    address: "18, APMC Market Yard, Ring Road",
    city: "Mysuru",
    district: "Mysuru",
    state: "Karnataka",
    country: "India",
    pinCode: "570020",
    lat: 12.2958,
    lng: 76.6394,
    gstNumber: "29BBAKP9876C1Z2",
    gstStatus: "Registered",
    udyamRegistration: "UDYAM-KA-14-0012903",
    panNumber: "BBAKP9876C",
    isVerified: true,
    verificationBadgeGranted: true,
    verificationNotes: "FSSAI Wholesale License & GST Verified.",
    rating: 4.9,
    reviewsCount: 218,
    totalTransactions: 890,
    joinedYear: 2023,
    verifiedAt: "2023-04-10"
  },
  {
    id: "biz-3",
    name: "Vanguard Infra Engineers & Contractors",
    tradeName: "Vanguard Infra",
    ownerName: "Vikramaditya Chauhan",
    businessType: "Service Provider",
    category: "Construction",
    description: "Turnkey industrial civil construction, structural steel pre-fabrication, and heavy earthmoving machinery rental services across Western India.",
    logo: "https://images.unsplash.com/photo-1503387762-592deb58ef4e?auto=format&fit=crop&w=200&h=200&q=80",
    coverImage: "https://images.unsplash.com/photo-1541888946425-d0fbb1861564?auto=format&fit=crop&w=1200&q=80",
    email: "projects@vanguardinfra.com",
    phone: "+91 99201 34567",
    address: "B-604, Godrej One, Pirojshanagar",
    city: "Mumbai",
    district: "Mumbai Suburban",
    state: "Maharashtra",
    country: "India",
    pinCode: "400079",
    lat: 19.0833,
    lng: 72.9312,
    gstNumber: "27AAACV4521H1ZP",
    gstStatus: "Registered",
    udyamRegistration: "UDYAM-MH-19-0098124",
    panNumber: "AAACV4521H",
    isVerified: true,
    verificationBadgeGranted: true,
    verificationNotes: "Class-A Civil Contractor license & verified GSTIN.",
    rating: 4.7,
    reviewsCount: 88,
    totalTransactions: 310,
    joinedYear: 2021,
    verifiedAt: "2022-08-20"
  },
  {
    id: "biz-4",
    name: "Desi Heritage Handlooms & Textiles",
    tradeName: "Desi Weaves",
    ownerName: "Meenakshi Sundaram",
    businessType: "Shop",
    category: "Fashion",
    description: "Authentic hand-woven pure silk sarees, khadi fabrics, organic cotton kurtas and bulk uniform textiles sourced directly from weaver clusters.",
    logo: "https://images.unsplash.com/photo-1509631179647-0177331693ae?auto=format&fit=crop&w=200&h=200&q=80",
    coverImage: "https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?auto=format&fit=crop&w=1200&q=80",
    email: "hello@desiweaves.in",
    phone: "+91 94440 67890",
    address: "45, Gandhi Bazaar Main Road",
    city: "Kanchipuram",
    district: "Kanchipuram",
    state: "Tamil Nadu",
    country: "India",
    pinCode: "631502",
    lat: 12.8342,
    lng: 79.7036,
    gstNumber: "33AABFD7890K1ZG",
    gstStatus: "Registered",
    panNumber: "AABFD7890K",
    isVerified: true,
    verificationBadgeGranted: true,
    verificationNotes: "Silk Mark & Handloom Mark verified establishment.",
    rating: 4.9,
    reviewsCount: 310,
    totalTransactions: 1240,
    joinedYear: 2020,
    verifiedAt: "2021-02-14"
  },
  {
    id: "biz-5",
    name: "UrbanPulse Smart Home Tech Solutions",
    tradeName: "UrbanPulse Tech",
    ownerName: "Ananya Deshmukh",
    businessType: "Retailer",
    category: "Electronics",
    description: "Authorized distributor of smart IoT switches, solar micro-inverters, commercial CCTV surveillance systems and automated sensor kits.",
    logo: "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&w=200&h=200&q=80",
    coverImage: "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1200&q=80",
    email: "contact@urbanpulse.in",
    phone: "+91 98230 45678",
    address: "Shop 12, FC Road IT Plaza",
    city: "Pune",
    district: "Pune",
    state: "Maharashtra",
    country: "India",
    pinCode: "411004",
    lat: 18.5204,
    lng: 73.8567,
    gstStatus: "Not Registered",
    isVerified: false,
    verificationBadgeGranted: false,
    verificationNotes: "Pending local shop establishment verification documents.",
    rating: 4.4,
    reviewsCount: 36,
    totalTransactions: 95,
    joinedYear: 2024
  },
  {
    id: "biz-6",
    name: "Narayana Healthcare Diagnostic Diagnostics",
    tradeName: "Narayana Diagnostics",
    ownerName: "Dr. Someshwar Bhattacharya",
    businessType: "Service Provider",
    category: "Healthcare Services",
    description: "NABL-accredited corporate diagnostic screenings, mobile blood testing van service, and wholesale supply of calibrated medical rapid test kits.",
    logo: "https://images.unsplash.com/photo-1516549655169-df83a0774514?auto=format&fit=crop&w=200&h=200&q=80",
    coverImage: "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=1200&q=80",
    email: "diagnostics@narayanacare.in",
    phone: "+91 98300 78901",
    address: "108, Park Circus Medical Enclave",
    city: "Kolkata",
    district: "Kolkata",
    state: "West Bengal",
    country: "India",
    pinCode: "700017",
    lat: 22.5405,
    lng: 88.3653,
    gstNumber: "19AADCN6543M1ZY",
    gstStatus: "Registered",
    isVerified: true,
    verificationBadgeGranted: true,
    verificationNotes: "NABL certified diagnostic provider & verified GSTIN.",
    rating: 4.8,
    reviewsCount: 165,
    totalTransactions: 620,
    joinedYear: 2022,
    verifiedAt: "2022-11-05"
  }
];

// High quality initial listings (each conforming to the 4–10 images rule!)
export const INITIAL_LISTINGS: ListingItem[] = [
  {
    id: "item-1",
    type: "Product",
    title: "Industrial High-Precision Servo Motor 3KW (IP65 Certified)",
    shortDescription: "High-torque continuous duty 3KW industrial AC servo motor with closed-loop 23-bit optical encoder for CNC & robotics.",
    detailedDescription: "Engineered specifically for heavy industrial manufacturing, high-precision pick-and-place automation, and multi-axis CNC milling centers. Equipped with an ingress protection rating of IP65, internal electromagnetic brake, and dynamic thermal dissipation fins.",
    keyFeatures: [
      "Continuous torque output of 15 Nm at 3000 RPM rated speed",
      "Integrated 23-bit high-resolution optical absolute encoder",
      "IP65 industrial enclosure resistant to water jets and abrasive metal dust",
      "Ultra-low rotor inertia for rapid acceleration & deceleration cycles"
    ],
    category: "Manufacturing",
    subcategory: "Motors & Actuators",
    price: 24500,
    unit: "Piece",
    availability: "In Stock",
    images: [
      "https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1581092335397-9583fe92d232?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1581092580497-e0d23cbdf1dc?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1504917599217-d4dc5ebe6122?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1581092795360-fd1ca04f0952?auto=format&fit=crop&w=800&q=80"
    ],
    primaryImageIndex: 0,
    keywords: ["servo motor", "industrial automation", "cnc components", "ip65 motor", "robotics actuator"],
    specifications: {
      "Rated Power": "3.0 KW",
      "Rated Speed": "3000 RPM",
      "Continuous Torque": "15 Nm",
      "Voltage": "415V 3-Phase",
      "Protection Class": "IP65 Waterproof & Dustproof",
      "Warranty": "2 Years Manufacturer Warranty"
    },
    businessId: "biz-1",
    businessName: "Apex Precision Instruments Pvt. Ltd.",
    businessCity: "Bengaluru",
    businessState: "Karnataka",
    businessVerified: true,
    status: "Published",
    views: 1840,
    orders: 48,
    createdAt: "2024-01-10"
  },
  {
    id: "item-2",
    type: "Product",
    title: "Organic Wayanad Black Pepper Grade TGSEB (50kg Bulk Jute Sack)",
    shortDescription: "Export-grade Tellicherry Garbled Special Extra Bold (TGSEB) sun-dried whole black pepper with minimum 5% piperine content.",
    detailedDescription: "Harvested from heritage biodiversity rain-fed estates in Wayanad, Kerala. Naturally sun-dried on clean hygienic mats to retain volatile essential oils. Stringently tested for zero aflatoxins and pesticide residues.",
    keyFeatures: [
      "TGSEB Grade with berries measuring over 4.75mm diameter",
      "Minimum essential oil content: 3.2% with bold pungent aroma",
      "Packed in multi-layer food-grade poly-lined jute sacks for long voyage freshness",
      "Certified organic by Aditi Organic Certifications (NPOP/APEDA)"
    ],
    category: "Food & Grocery",
    subcategory: "Spices & Condiments",
    price: 36000,
    unit: "50kg Sack",
    availability: "In Stock",
    images: [
      "https://images.unsplash.com/photo-1596040033229-a9821ebd058d?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1509358271058-acd22cc93898?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1506368249639-73a05d6f6488?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1514733670139-4d87a1941d55?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1615485290382-441e4d049cb5?auto=format&fit=crop&w=800&q=80"
    ],
    primaryImageIndex: 0,
    keywords: ["black pepper", "tellicherry pepper", "organic spices", "bulk spices", "spices wholesale"],
    specifications: {
      "Grade": "TGSEB (Tellicherry Garbled Special Extra Bold)",
      "Moisture": "< 11.0%",
      "Piperine Content": "5.4%",
      "Origin": "Wayanad, Kerala",
      "Certification": "NPOP / APEDA Organic Certified",
      "Shelf Life": "24 Months"
    },
    businessId: "biz-2",
    businessName: "Kaveri Organic Agro Hub",
    businessCity: "Mysuru",
    businessState: "Karnataka",
    businessVerified: true,
    status: "Published",
    views: 1220,
    orders: 34,
    createdAt: "2024-02-14"
  },
  {
    id: "item-3",
    type: "Service",
    title: "Turnkey Pre-Engineered Industrial Steel Warehouse Construction",
    shortDescription: "Complete EPC engineering, structural steel fabrication, foundation civil works, and roofing installation for industrial logistics parks.",
    detailedDescription: "End-to-end turnkey project execution from structural design analysis (STAAD Pro) to erection and PEB roofing sheeting. Heavy gauge galvanized steel beams with zero defect welding standards and certified safety protocols.",
    keyFeatures: [
      "Custom clear-span designs up to 60 meters without central column hindrance",
      "High tensile steel (Grade 345/350 MPa) with anti-corrosive primer coating",
      "Turnkey timeline: 50,000 sq ft warehouse erected in 90 working days",
      "Complete civil foundation, flooring, PU insulated roofing and turbo vents"
    ],
    category: "Construction",
    subcategory: "Industrial Engineering",
    price: 1850000,
    unit: "Project Base",
    availability: "Active",
    images: [
      "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1503387762-592deb58ef4e?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1589939705384-5185137a7f0f?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=800&q=80"
    ],
    primaryImageIndex: 0,
    keywords: ["peb warehouse", "industrial construction", "steel building", "factory shed", "epc contractor"],
    specifications: {
      "Structural Grade": "IS 2062 / ASTM A572 Grade 50",
      "Wind Speed Design": "Up to 180 km/h (IS 875 Part 3)",
      "Roofing": "0.5mm Galvalume Corrugated Sheets (AZ150)",
      "Project Completion": "60 - 90 Days",
      "Warranty": "10-Year Structural Integrity Warranty"
    },
    businessId: "biz-3",
    businessName: "Vanguard Infra Engineers & Contractors",
    businessCity: "Mumbai",
    businessState: "Maharashtra",
    businessVerified: true,
    status: "Published",
    views: 2450,
    orders: 12,
    createdAt: "2024-01-28"
  },
  {
    id: "item-4",
    type: "Product",
    title: "Pure Mulberry Kanchipuram Handloom Silk Bridal Saree (Zari Woven)",
    shortDescription: "Traditional temple border bridal silk saree handcrafted on pit looms with authenticated Silk Mark certification and pure gold-silver thread work.",
    detailedDescription: "Master weavers spend 18-24 days on traditional hand-operated wooden pit looms interlacing three plies of mulberry silk threads. Features traditional peacock, rudraksham, and temple spires motifs along the heavy contrast pallu.",
    keyFeatures: [
      "100% Genuine Mulberry Silk tested and tagged with Silk Mark Organization of India QR",
      "Pure silver electroplated zari yarn woven into korvai contrast borders",
      "Heavy grand pallu ideal for wedding rituals and festive heirloom wardrobes",
      "Includes matched unstitched pure silk blouse fabric piece (80 cm)"
    ],
    category: "Fashion",
    subcategory: "Ethnic Wear",
    price: 32500,
    unit: "Piece",
    availability: "In Stock",
    images: [
      "https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1509631179647-0177331693ae?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1566174053879-31528523f8ae?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1512436991641-6745cdb1723f?auto=format&fit=crop&w=800&q=80"
    ],
    primaryImageIndex: 0,
    keywords: ["kanchipuram silk", "bridal saree", "pure silk saree", "handloom silk", "zari work"],
    specifications: {
      "Fabric": "100% Pure Mulberry Silk",
      "Weave Type": "Traditional Handloom Pit-Loom Weave",
      "Zari Type": "Tested Fine Metallic Zari",
      "Length": "6.2 Metres (including blouse piece)",
      "Care": "Strictly Dry Clean Only",
      "Certification": "Silk Mark India Authorized"
    },
    businessId: "biz-4",
    businessName: "Desi Heritage Handlooms & Textiles",
    businessCity: "Kanchipuram",
    businessState: "Tamil Nadu",
    businessVerified: true,
    status: "Published",
    views: 3120,
    orders: 67,
    createdAt: "2024-03-01"
  },
  {
    id: "item-5",
    type: "Product",
    title: "Commercial Grade 4K Dual-Sensor AI CCTV Surveillance Dome Camera",
    shortDescription: " vandal-resistant IK10 rated 4K outdoor optical zoom dome with person/vehicle classification and 50-meter infrared night vision.",
    detailedDescription: "Designed for commercial shopping complexes, factory perimeters, and bank branches. Features dual onboard AI processors capable of detecting perimeter intrusions, license plate reading at 60 km/h, and bidirectional audio talkdown.",
    keyFeatures: [
      "Ultra HD 8 Megapixel (3840 x 2160) recording at 30 frames per second",
      "Smart IR illumination up to 50 meters with true 120dB WDR",
      "IK10 vandal-proof and IP67 weather-tight die-cast aluminum casing",
      "Power over Ethernet (PoE 802.3af) and ONVIF Profile S/G/T compliance"
    ],
    category: "Electronics",
    subcategory: "Security & Surveillance",
    price: 11400,
    unit: "Unit",
    availability: "In Stock",
    images: [
      "https://images.unsplash.com/photo-1557597774-9d273605dfa9?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1508739773434-c26b3d09e071?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=800&q=80"
    ],
    primaryImageIndex: 0,
    keywords: ["cctv camera", "4k dome camera", "surveillance system", "poe security", "ip67 camera"],
    specifications: {
      "Resolution": "8MP / 4K UHD (3840 x 2160)",
      "Lens": "2.8mm - 12mm Motorized Varifocal",
      "Power Supply": "12V DC / PoE (802.3af)",
      "Night Vision": "50m Smart IR Matrix",
      "Vandal Rating": "IK10 Impact Proof",
      "Warranty": "3 Years Onsite Replacement"
    },
    businessId: "biz-5",
    businessName: "UrbanPulse Smart Home Tech Solutions",
    businessCity: "Pune",
    businessState: "Maharashtra",
    businessVerified: false,
    status: "Published",
    views: 890,
    orders: 19,
    createdAt: "2024-03-12"
  },
  {
    id: "item-6",
    type: "Service",
    title: "Comprehensive Annual Corporate Health Checkup & Diagnostic Camps",
    shortDescription: "On-premises turnkey corporate wellness camps including 72-parameter blood tests, ECG, pulmonary function, and digital reports within 24 hours.",
    detailedDescription: "Designed for corporate headquarters, manufacturing plant personnel, and IT tech parks. Fully equipped mobile pathology vans with certified phlebotomists, digital ECG machines, and physician consultation booths.",
    keyFeatures: [
      "72 vital health parameters (CBC, Lipid profile, Liver/Kidney function, HbA1c, Vitamin D3/B12)",
      "Onsite deployment of mobile medical team & cold-chain sample preservation",
      "Confidential electronic health records (EHR) accessible via secure employee portal",
      "Post-checkup aggregate corporate wellness trends & ergonomics recommendations report"
    ],
    category: "Healthcare Services",
    subcategory: "Corporate Wellness",
    price: 1850,
    unit: "Per Employee",
    availability: "Active",
    images: [
      "https://images.unsplash.com/photo-1516549655169-df83a0774514?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1579684385127-1ef15d508118?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1532938911079-1b06ac7ceec7?auto=format&fit=crop&w=800&q=80"
    ],
    primaryImageIndex: 0,
    keywords: ["corporate health checkup", "diagnostic camp", "nabl laboratory", "employee wellness", "blood tests"],
    specifications: {
      "Accreditation": "NABL & ICMR Certified Labs",
      "Report Turnaround": "24 Hours Digital Delivery",
      "Minimum Camp Size": "25 Employees",
      "Coverage": "Pan-India Metropolitan & Tier-2 Hubs",
      "Doctor Review": "Included Tele-Consultation with Senior MD"
    },
    businessId: "biz-6",
    businessName: "Narayana Healthcare Diagnostic Diagnostics",
    businessCity: "Kolkata",
    businessState: "West Bengal",
    businessVerified: true,
    status: "Published",
    views: 1450,
    orders: 52,
    createdAt: "2024-02-18"
  }
];

// Sample Transparent Transactions (Category-based Noryvanta Platform Fee strictly separated)
export const INITIAL_TRANSACTIONS: TransactionRecord[] = [
  {
    id: "txn-101",
    date: "2026-09-28",
    orderId: "ORD-2026-8901",
    customerName: "Bharat Precision Forgings Ltd.",
    listingId: "item-1",
    itemTitle: "Industrial High-Precision Servo Motor 3KW (IP65 Certified)",
    businessId: "biz-1",
    businessName: "Apex Precision Instruments Pvt. Ltd.",
    grossAmount: 49000,
    platformFeeRate: 0.032, // Wholesaler 3.20%
    platformFeeAmount: 1568,
    gstOnFeeAmount: 282, // 18% of 1568
    otherCharges: 0,
    netSettlement: 47150,
    status: "Successful",
    paymentMethod: "NEFT / RTGS Escrow"
  },
  {
    id: "txn-102",
    date: "2026-09-29",
    orderId: "ORD-2026-8902",
    customerName: "SpiceCraft Exports UK Ltd.",
    listingId: "item-2",
    itemTitle: "Organic Wayanad Black Pepper Grade TGSEB (50kg Bulk Jute Sack)",
    businessId: "biz-2",
    businessName: "Kaveri Organic Agro Hub",
    grossAmount: 180000,
    platformFeeRate: 0.052, // Distributor 5.20%
    platformFeeAmount: 9360,
    gstOnFeeAmount: 1685,
    otherCharges: 0,
    netSettlement: 168955,
    status: "Successful",
    paymentMethod: "UPI Instant B2B"
  },
  {
    id: "txn-103",
    date: "2026-09-30",
    orderId: "ORD-2026-8903",
    customerName: "Surya Kripa Retailers",
    listingId: "item-4",
    itemTitle: "Pure Mulberry Kanchipuram Handloom Silk Bridal Saree (Zari Woven)",
    businessId: "biz-4",
    businessName: "Desi Heritage Handlooms & Textiles",
    grossAmount: 65000,
    platformFeeRate: 0.082, // Retailer 8.20%
    platformFeeAmount: 5330,
    gstOnFeeAmount: 959,
    otherCharges: 0,
    netSettlement: 58711,
    status: "Successful",
    paymentMethod: "NetBanking"
  },
  {
    id: "txn-104",
    date: "2026-10-01",
    orderId: "ORD-2026-8904",
    customerName: "Technova Infra Park Ltd.",
    listingId: "item-3",
    itemTitle: "Turnkey Pre-Engineered Industrial Steel Warehouse Construction",
    businessId: "biz-3",
    businessName: "Vanguard Infra Engineers & Contractors",
    grossAmount: 1850000,
    platformFeeRate: 0.052, // Services 5.20%
    platformFeeAmount: 96200,
    gstOnFeeAmount: 17316,
    otherCharges: 0,
    netSettlement: 1736484,
    status: "Pending",
    paymentMethod: "Institutional Wire Escrow"
  },
  {
    id: "txn-105",
    date: "2026-10-02",
    orderId: "ORD-2026-8905",
    customerName: "Metro Logistics Hub",
    listingId: "item-5",
    itemTitle: "Commercial Grade 4K Dual-Sensor AI CCTV Surveillance Dome Camera",
    businessId: "biz-5",
    businessName: "UrbanPulse Smart Home Tech Solutions",
    grossAmount: 22800,
    platformFeeRate: 0.052, // Services 5.20%
    platformFeeAmount: 1186,
    gstOnFeeAmount: 213,
    otherCharges: 0,
    netSettlement: 21401,
    status: "Pending",
    paymentMethod: "Credit Card (Corporate)"
  }
];

// Helper calculations re-exported from centralized configuration
export { calculatePlatformFee, getPlatformFeeRateForType } from "./platformFeeConfig";

// Format INR currency standard
export function formatINR(val: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0
  }).format(val);
}
