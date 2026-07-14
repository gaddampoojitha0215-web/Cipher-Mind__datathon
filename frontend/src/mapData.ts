// Karnataka Geographical Intelligence Database for CrimeMind AI

export interface LocationFeature {
  id: string;
  name: string;
  type: "city" | "town" | "village" | "police_station" | "landmark" | "airport" | "railway" | "bus_station";
  lat: number;
  lon: number;
}

export interface Highway {
  name: string;
  path: { lat: number; lon: number }[];
}

export interface DistrictData {
  id: string;
  name: string;
  lat: number;
  lon: number;
  capital: string;
  policeStations: string[];
  landmarks: string[];
  crimeRateIndex: number; // 0-100 scale for heatmap
  commonCrime: string;
}

// Bounding box for Karnataka coordinates
export const MIN_LAT = 11.5;
export const MAX_LAT = 18.2;
export const MIN_LON = 74.0;
export const MAX_LON = 78.5;

// Convert Lat/Lon to SVG Coordinate space (0-500 x 0-800)
export function latLonToSvg(lat: number, lon: number, width = 500, height = 800) {
  // SVG Y starts at 0 at the top, so we invert lat
  const x = ((lon - MIN_LON) / (MAX_LON - MIN_LON)) * width;
  const y = ((MAX_LAT - lat) / (MAX_LAT - MIN_LAT)) * height;
  return { x, y };
}

export const KARNATAKA_DISTRICTS: DistrictData[] = [
  { id: "bidar", name: "Bidar", lat: 17.91, lon: 77.50, capital: "Bidar", policeStations: ["Bidar Town PS", "Aurad PS", "Bhalki PS"], landmarks: ["Bidar Fort", "Mahmud Gawan Madrasa"], crimeRateIndex: 42, commonCrime: "Theft" },
  { id: "kalaburagi", name: "Kalaburagi", lat: 17.33, lon: 76.83, capital: "Kalaburagi", policeStations: ["Kalaburagi Central PS", "Chincholi PS", "Aland PS"], landmarks: ["Gulbarga Fort", "Khwaja Bande Nawaz Dargah"], crimeRateIndex: 58, commonCrime: "Cyber Crime" },
  { id: "yadgir", name: "Yadgir", lat: 16.77, lon: 77.13, capital: "Yadgir", policeStations: ["Yadgir Town PS", "Shorapur PS", "Shahpur PS"], landmarks: ["Yadgir Hill Fort", "Shorapur Palace"], crimeRateIndex: 35, commonCrime: "Assault" },
  { id: "vijayapura", name: "Vijayapura", lat: 16.83, lon: 75.71, capital: "Vijayapura", policeStations: ["Vijayapura City PS", "Muddebihal PS", "Indi PS"], landmarks: ["Gol Gumbaz", "Ibrahim Rauza"], crimeRateIndex: 55, commonCrime: "Robbery" },
  { id: "raichur", name: "Raichur", lat: 16.20, lon: 77.36, capital: "Raichur", policeStations: ["Raichur West PS", "Manvi PS", "Sindhanur PS"], landmarks: ["Raichur Fort", "Thermal Power Plant Station"], crimeRateIndex: 48, commonCrime: "Homicide" },
  { id: "bagalkote", name: "Bagalkote", lat: 16.18, lon: 75.69, capital: "Bagalkote", policeStations: ["Bagalkote Central PS", "Jamkhandi PS", "Mudhol PS"], landmarks: ["Badami Cave Temples", "Pattadakal Monument"], crimeRateIndex: 40, commonCrime: "Theft" },
  { id: "belagavi", name: "Belagavi", lat: 15.85, lon: 74.50, capital: "Belagavi", policeStations: ["Belagavi Town PS", "Gokak PS", "Athani PS", "Chikodi PS"], landmarks: ["Suvarna Vidhana Soudha", "Belagavi Fort"], crimeRateIndex: 65, commonCrime: "Homicide" },
  { id: "koppal", name: "Koppal", lat: 15.35, lon: 76.15, capital: "Koppal", policeStations: ["Koppal Town PS", "Gangavathi PS", "Yelbarga PS"], landmarks: ["Koppal Fort", "Kanakagiri Temple"], crimeRateIndex: 32, commonCrime: "Theft" },
  { id: "gadag", name: "Gadag", lat: 15.43, lon: 75.63, capital: "Gadag", policeStations: ["Gadag City PS", "Ron PS", "Mundargi PS"], landmarks: ["Trikuteshwara Temple", "Veera Narayana Temple"], crimeRateIndex: 38, commonCrime: "Cyber Crime" },
  { id: "dharwad", name: "Dharwad", lat: 15.45, lon: 75.00, capital: "Dharwad", policeStations: ["Dharwad Town PS", "Hubli North PS", "Hubli South PS"], landmarks: ["Unkal Lake", "IIT Dharwad Campus"], crimeRateIndex: 60, commonCrime: "Robbery" },
  { id: "uttara-kennada", name: "Uttara Kannada", lat: 14.80, lon: 74.60, capital: "Karwar", policeStations: ["Karwar PS", "Gokarna PS", "Sirsi PS", "Bhatkal PS"], landmarks: ["Jog Falls", "Gokarna Mahabaleshwar Temple", "Karwar Port"], crimeRateIndex: 45, commonCrime: "Missing Persons" },
  { id: "ballari", name: "Ballari", lat: 15.15, lon: 76.93, capital: "Ballari", policeStations: ["Ballari Central PS", "Siruguppa PS", "Sandur PS"], landmarks: ["Ballari Fort", "Sandur Hills"], crimeRateIndex: 52, commonCrime: "Cyber Crime" },
  { id: "vijayanagara", name: "Vijayanagara", lat: 15.29, lon: 76.38, capital: "Hosapete", policeStations: ["Hosapete PS", "Hampi PS", "Hadagali PS"], landmarks: ["Hampi Ruins", "Virupaksha Temple", "Tungabhadra Dam"], crimeRateIndex: 43, commonCrime: "Theft" },
  { id: "haveri", name: "Haveri", lat: 14.80, lon: 75.40, capital: "Haveri", policeStations: ["Haveri Town PS", "Ranebennur PS", "Savanur PS"], landmarks: ["Siddheshwara Temple", "Blackbuck Sanctuary"], crimeRateIndex: 36, commonCrime: "Assault" },
  { id: "shivamogga", name: "Shivamogga", lat: 14.03, lon: 75.40, capital: "Shivamogga", policeStations: ["Shivamogga City PS", "Bhadravathi PS", "Sagar PS"], landmarks: ["Bhadra Wildlife Sanctuary", "Kodachadri Hills"], crimeRateIndex: 50, commonCrime: "Theft" },
  { id: "davangere", name: "Davangere", lat: 14.46, lon: 75.92, capital: "Davangere", policeStations: ["Davangere Central PS", "Harihar PS", "Channagiri PS"], landmarks: ["Kondajji Lake", "Glass House Park"], crimeRateIndex: 46, commonCrime: "Assault" },
  { id: "chitradurga", name: "Chitradurga", lat: 14.23, lon: 76.40, capital: "Chitradurga", policeStations: ["Chitradurga Fort PS", "Hiriyur PS", "Holalkere PS"], landmarks: ["Chitradurga Stone Fort", "Vani Vilasa Sagara Dam"], crimeRateIndex: 41, commonCrime: "Robbery" },
  { id: "udupi", name: "Udupi", lat: 13.34, lon: 74.74, capital: "Udupi", policeStations: ["Udupi Town PS", "Manipal PS", "Kundapura PS", "Karkala PS"], landmarks: ["Sri Krishna Temple", "Malpe Beach", "St Mary's Island"], crimeRateIndex: 44, commonCrime: "Cyber Crime" },
  { id: "chikkamagaluru", name: "Chikkamagaluru", lat: 13.32, lon: 75.78, capital: "Chikkamagaluru", policeStations: ["Chikkamagaluru Town PS", "Kadur PS", "Mudra PS"], landmarks: ["Mullayanagiri Peak", "Baba Budangiri Hills", "Kudremukh National Park"], crimeRateIndex: 39, commonCrime: "Missing Persons" },
  { id: "dakshina-kannada", name: "Dakshina Kannada", lat: 12.87, lon: 74.88, capital: "Mangaluru", policeStations: ["Mangaluru Central PS", "Bantwal PS", "Puttur PS", "Sullia PS"], landmarks: ["Kadri Manjunath Temple", "Panambur Beach", "Mangalore Port"], crimeRateIndex: 62, commonCrime: "Drug Trafficking" },
  { id: "hassan", name: "Hassan", lat: 13.01, lon: 76.10, capital: "Hassan", policeStations: ["Hassan Town PS", "Belur PS", "Halebidu PS"], landmarks: ["Chennakesava Temple", "Hoysaleswara Temple", "Shravanabelagola"], crimeRateIndex: 40, commonCrime: "Theft" },
  { id: "tumakuru", name: "Tumakuru", lat: 13.34, lon: 77.10, capital: "Tumakuru", policeStations: ["Tumakuru Central PS", "Sira PS", "Tiptur PS", "Madhugiri PS"], landmarks: ["Devarayanadurga Hills", "Siddaganga Mutt", "Madhugiri Fort"], crimeRateIndex: 49, commonCrime: "Robbery" },
  { id: "chikkaballapur", name: "Chikkaballapur", lat: 13.43, lon: 77.73, capital: "Chikkaballapur", policeStations: ["Chikkaballapur PS", "Gauribidanur PS", "Chintamani PS"], landmarks: ["Nandi Hills", "Bhoga Nandeeshwara Temple"], crimeRateIndex: 37, commonCrime: "Theft" },
  { id: "kolar", name: "Kolar", lat: 13.13, lon: 78.13, capital: "Kolar", policeStations: ["Kolar Town PS", "Mulbagal PS", "KGF PS"], landmarks: ["Kolar Gold Fields", "Someshwara Temple"], crimeRateIndex: 47, commonCrime: "Theft" },
  { id: "bengaluru-rural", name: "Bengaluru Rural", lat: 13.25, lon: 77.58, capital: "Doddaballapura", policeStations: ["Doddaballapura PS", "Devanahalli PS", "Hosakote PS"], landmarks: ["Kempegowda Int'l Airport", "Ghati Subramanya Temple"], crimeRateIndex: 51, commonCrime: "Robbery" },
  { id: "bengaluru-urban", name: "Bengaluru Urban", lat: 12.97, lon: 77.59, capital: "Bengaluru", policeStations: ["Jayanagar PS", "Indiranagar PS", "Whitefield PS", "Electronic City PS", "KSP Intelligence HQ"], landmarks: ["Vidhana Soudha", "Lalbagh Botanical Garden", "Bangalore Palace", "Chinnaswamy Stadium"], crimeRateIndex: 88, commonCrime: "Cyber Crime" },
  { id: "ramanagara", name: "Ramanagara", lat: 12.72, lon: 77.28, capital: "Ramanagara", policeStations: ["Ramanagara PS", "Channapatna PS", "Magadi PS"], landmarks: ["Ramadevara Betta (Sholay Hills)", "Janapada Loka"], crimeRateIndex: 38, commonCrime: "Theft" },
  { id: "mandya", name: "Mandya", lat: 12.52, lon: 76.90, capital: "Mandya", policeStations: ["Mandya Central PS", "Maddur PS", "Srirangapatna PS"], landmarks: ["Krishna Raja Sagara Dam", "Brindavan Gardens", "Ranganathittu Bird Sanctuary"], crimeRateIndex: 43, commonCrime: "Assault" },
  { id: "kodagu", name: "Kodagu", lat: 12.42, lon: 75.73, capital: "Madikeri", policeStations: ["Madikeri Town PS", "Virajpet PS", "Somwarpet PS"], landmarks: ["Abbey Falls", "Raja's Seat", "Golden Temple Kushalnagar"], crimeRateIndex: 30, commonCrime: "Missing Persons" },
  { id: "mysuru", name: "Mysuru", lat: 12.30, lon: 76.64, capital: "Mysuru", policeStations: ["Mysuru Central PS", "Kuempunagar PS", "Vidyaranyapuram PS"], landmarks: ["Mysore Palace", "Chamundi Hills", "Mysuru Zoo"], crimeRateIndex: 56, commonCrime: "Theft" },
  { id: "chamarajanagar", name: "Chamarajanagar", lat: 11.92, lon: 76.94, capital: "Chamarajanagar", policeStations: ["Chamarajanagar Town PS", "Kollegal PS", "Gundlupet PS"], landmarks: ["Bara Chukki Falls", "Bandipur Tiger Reserve"], crimeRateIndex: 31, commonCrime: "Poaching" }
];

// Rich map features to display when zoomed in
export const MAP_LOCATION_FEATURES: LocationFeature[] = [];

// Populate MAP_LOCATION_FEATURES dynamically based on districts to guarantee heavy details
KARNATAKA_DISTRICTS.forEach(d => {
  // HQ Capital City
  MAP_LOCATION_FEATURES.push({
    id: `city-${d.id}`,
    name: d.capital,
    type: "city",
    lat: d.lat,
    lon: d.lon
  });

  // Police Stations
  d.policeStations.forEach((ps, idx) => {
    MAP_LOCATION_FEATURES.push({
      id: `ps-${d.id}-${idx}`,
      name: ps,
      type: "police_station",
      // Offset slightly from HQ center
      lat: d.lat + (idx % 2 === 0 ? 0.08 : -0.08) * (idx + 1),
      lon: d.lon + (idx % 2 === 1 ? 0.08 : -0.08) * (idx + 1)
    });
  });

  // Landmarks
  d.landmarks.forEach((lm, idx) => {
    MAP_LOCATION_FEATURES.push({
      id: `landmark-${d.id}-${idx}`,
      name: lm,
      type: "landmark",
      lat: d.lat + (idx % 2 === 1 ? 0.12 : -0.06) * (idx + 1.2),
      lon: d.lon + (idx % 2 === 0 ? 0.09 : -0.11) * (idx + 1.2)
    });
  });

  // Towns & Villages
  MAP_LOCATION_FEATURES.push({
    id: `town-${d.id}-1`,
    name: `${d.capital} Suburban Town`,
    type: "town",
    lat: d.lat - 0.14,
    lon: d.lon + 0.15
  });
  MAP_LOCATION_FEATURES.push({
    id: `village-${d.id}-1`,
    name: `${d.capital} Rural Village`,
    type: "village",
    lat: d.lat + 0.18,
    lon: d.lon - 0.16
  });

  // Transport Stations
  MAP_LOCATION_FEATURES.push({
    id: `railway-${d.id}`,
    name: `${d.capital} Jn Railway Station`,
    type: "railway",
    lat: d.lat + 0.04,
    lon: d.lon - 0.03
  });
  MAP_LOCATION_FEATURES.push({
    id: `bus-${d.id}`,
    name: `${d.capital} Central Bus Station`,
    type: "bus_station",
    lat: d.lat - 0.03,
    lon: d.lon + 0.04
  });

  // Major Airports (Only in Bengaluru, Mangaluru, Belagavi, Hubli, Mysuru)
  if (["bengaluru-urban", "bengaluru-rural", "dakshina-kannada", "belagavi", "dharwad", "mysuru"].includes(d.id)) {
    MAP_LOCATION_FEATURES.push({
      id: `airport-${d.id}`,
      name: d.id.includes("bengaluru") ? "Kempegowda Int'l Airport (BLR)" : `${d.capital} Airport`,
      type: "airport",
      lat: d.lat + 0.22,
      lon: d.lon + 0.18
    });
  }
});

// Major Highways in Karnataka
export const KARNATAKA_HIGHWAYS: Highway[] = [
  {
    name: "NH-48 (Bengaluru - Hubballi - Belagavi)",
    path: [
      { lat: 12.97, lon: 77.59 }, // Blr
      { lat: 13.34, lon: 77.10 }, // Tumakuru
      { lat: 14.23, lon: 76.40 }, // Chitradurga
      { lat: 14.46, lon: 75.92 }, // Davangere
      { lat: 14.80, lon: 75.40 }, // Haveri
      { lat: 15.45, lon: 75.00 }, // Dharwad
      { lat: 15.85, lon: 74.50 }  // Belagavi
    ]
  },
  {
    name: "NH-75 (Bengaluru - Kolar)",
    path: [
      { lat: 12.97, lon: 77.59 },
      { lat: 13.13, lon: 78.13 }  // Kolar
    ]
  },
  {
    name: "Mysuru Express Highway (Bengaluru - Ramanagara - Mandya - Mysuru)",
    path: [
      { lat: 12.97, lon: 77.59 },
      { lat: 12.72, lon: 77.28 }, // Ramanagara
      { lat: 12.52, lon: 76.90 }, // Mandya
      { lat: 12.30, lon: 76.64 }  // Mysuru
    ]
  },
  {
    name: "NH-275 (Mysuru - Kodagu - Mangaluru)",
    path: [
      { lat: 12.30, lon: 76.64 },
      { lat: 12.42, lon: 75.73 }, // Kodagu
      { lat: 12.87, lon: 74.88 }  // Mangaluru
    ]
  },
  {
    name: "Coastal Highway NH-66 (Mangaluru - Udupi - Karwar)",
    path: [
      { lat: 12.87, lon: 74.88 },
      { lat: 13.34, lon: 74.74 }, // Udupi
      { lat: 14.80, lon: 74.60 }  // Karwar
    ]
  }
];

// Simulated Patrol Routes
export interface PatrolRoute {
  id: string;
  name: string;
  districtId: string;
  coords: { lat: number; lon: number }[];
}

export const PATROL_ROUTES: PatrolRoute[] = KARNATAKA_DISTRICTS.map((d, idx) => ({
  id: `patrol-${d.id}`,
  name: `KSP Patrol Route: Precinct ${d.capital}`,
  districtId: d.id,
  coords: [
    { lat: d.lat, lon: d.lon },
    { lat: d.lat + 0.05, lon: d.lon - 0.04 },
    { lat: d.lat + 0.02, lon: d.lon + 0.06 },
    { lat: d.lat - 0.04, lon: d.lon + 0.02 },
    { lat: d.lat, lon: d.lon } // closed loop
  ]
}));

// Simulated CCTV Locations
export interface CctvCamera {
  id: string;
  districtId: string;
  name: string;
  lat: number;
  lon: number;
  status: "active" | "inactive";
}

export const CCTV_CAMERAS: CctvCamera[] = [];
KARNATAKA_DISTRICTS.forEach((d) => {
  for (let i = 0; i < 4; i++) {
    CCTV_CAMERAS.push({
      id: `cctv-${d.id}-${i}`,
      districtId: d.id,
      name: `CCTV Cam #${1000 + i} - ${d.capital} Intersection`,
      lat: d.lat + (i === 0 ? 0.03 : i === 1 ? -0.04 : i === 2 ? 0.02 : -0.01),
      lon: d.lon + (i === 0 ? -0.02 : i === 1 ? 0.03 : i === 2 ? -0.05 : 0.04),
      status: i === 3 ? "inactive" : "active"
    });
  }
});
