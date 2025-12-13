import * as Astronomy from 'astronomy-engine';
import { PlanetPosition } from './types';

// Constants for Zodiac Signs
const ZODIAC_SIGNS = [
  'Aries', 'Tauro', 'Géminis', 'Cáncer', 'Leo', 'Virgo',
  'Libra', 'Escorpio', 'Sagitario', 'Capricornio', 'Acuario', 'Piscis'
];

const SIGN_ELEMENTS: Record<string, string> = {
  'Aries': 'Fuego', 'Leo': 'Fuego', 'Sagitario': 'Fuego',
  'Tauro': 'Tierra', 'Virgo': 'Tierra', 'Capricornio': 'Tierra',
  'Géminis': 'Aire', 'Libra': 'Aire', 'Acuario': 'Aire',
  'Cáncer': 'Agua', 'Escorpio': 'Agua', 'Piscis': 'Agua'
};

/**
 * Converts decimal degrees to Zodiac format (e.g., 20.5 -> 20°30' Aries)
 */
function degreeToZodiac(deg: number): { sign: string; degreeStr: string; absoluteDeg: number } {
  const normalized = (deg + 360) % 360;
  const signIndex = Math.floor(normalized / 30);
  const sign = ZODIAC_SIGNS[signIndex];
  const degreesInSign = normalized % 30;
  
  const d = Math.floor(degreesInSign);
  const m = Math.floor((degreesInSign - d) * 60);
  
  return {
    sign,
    degreeStr: `${d}°${m.toString().padStart(2, '0')}'`,
    absoluteDeg: normalized
  };
}

/**
 * Calculates Natal Chart positions using Astronomy Engine
 * This mimics the logic of the Python script but runs in the browser.
 */
export function calculateChartData(
  dateStr: string, 
  timeStr: string, 
  lat: number, 
  lon: number
): { positions: PlanetPosition[]; balance: any[] } {
  
  const date = new Date(`${dateStr}T${timeStr}:00`);
  
  // Create Observer
  const observer = new Astronomy.Observer(lat, lon, 0);
  
  const planets = [
    { name: 'Sol', body: Astronomy.Body.Sun },
    { name: 'Luna', body: Astronomy.Body.Moon },
    { name: 'Mercurio', body: Astronomy.Body.Mercury },
    { name: 'Venus', body: Astronomy.Body.Venus },
    { name: 'Marte', body: Astronomy.Body.Mars },
    { name: 'Júpiter', body: Astronomy.Body.Jupiter },
    { name: 'Saturno', body: Astronomy.Body.Saturn },
    { name: 'Urano', body: Astronomy.Body.Uranus },
    { name: 'Neptuno', body: Astronomy.Body.Neptune },
    { name: 'Plutón', body: Astronomy.Body.Pluto },
    // Nodes not directly in simple enum, usually calculated separately. 
    // Using approximation or omitting for brevity in this engine version if complex.
  ];

  const positions: PlanetPosition[] = [];
  const balanceCounts = { Fuego: 0, Tierra: 0, Aire: 0, Agua: 0 };

  // 1. Calculate Planet Positions
  planets.forEach(p => {
    // Equator coordinates (RA/Dec)
    const equator = Astronomy.Equator(p.body, date, observer, true, true);
    // Convert to Ecliptic (Longitude/Latitude) to get Zodiac position
    const ecliptic = Astronomy.Ecliptic(equator.vec);
    
    // Convert longitude to degrees
    const lonDeg = ecliptic.elon; 
    
    // Check Retrograde (Compare with position 1 hour later)
    const dateLater = new Date(date.getTime() + 3600 * 1000);
    const equatorLater = Astronomy.Equator(p.body, dateLater, observer, true, true);
    const eclipticLater = Astronomy.Ecliptic(equatorLater.vec);
    const isRetro = eclipticLater.elon < ecliptic.elon && (ecliptic.elon - eclipticLater.elon) < 180; // Basic check

    const zodiac = degreeToZodiac(lonDeg);
    const element = SIGN_ELEMENTS[zodiac.sign] as any;
    
    if (element) balanceCounts[element as keyof typeof balanceCounts]++;

    positions.push({
      name: p.name,
      sign: zodiac.sign,
      degree: zodiac.degreeStr,
      house: "1", // House calc requires Sidereal Time, doing simplified Equal House from Asc below
      retrograde: isRetro,
      element: element || 'Fuego',
      longitude: lonDeg
    });
  });

  // 2. Calculate Ascendant (Approximate)
  // We need Local Sidereal Time (LST)
  // Astronomy Engine provides Sidereal Time
  const now = Astronomy.MakeTime(date);
  const gst = Astronomy.SiderealTime(now); // Greenwich Sidereal Time in hours
  const lst = (gst + lon / 15 + 24) % 24; // Local Sidereal Time
  
  // Formula for Ascendant (RAMC = LST * 15)
  // tan(ASC) = cos(RAMC) / - (sin(RAMC) * cos(E) + tan(Lat) * sin(E)) 
  // Simplified: Using Astronomy Engine's helper if available, or math.
  // Actually, Astronomy Engine doesn't have a direct "Ascendant" function exposed easily.
  // Let's use a simplified logical approximation or just set it to a known offset for visual demo purposes
  // to guarantee valid "Fraktal" visuals without importing a 2nd library.
  // BETTER: Use Heliocentric vs Geocentric logic to determine structure. 
  
  // Let's stick to the positions we calculated. For the Visual Chart, we will use the positions.
  // For the Ascendant, let's calculate it properly using the math:
  const ramc = lst * 15 * (Math.PI / 180);
  const epsilon = 23.439 * (Math.PI / 180); // Obliquity
  const latRad = lat * (Math.PI / 180);
  
  let ascRad = Math.atan2(Math.cos(ramc), -Math.sin(ramc) * Math.cos(epsilon) - Math.tan(latRad) * Math.sin(epsilon));
  let ascDeg = (ascRad * 180 / Math.PI + 360) % 360;
  
  const zodiacAsc = degreeToZodiac(ascDeg);
  
  positions.unshift({
    name: 'Ascendente',
    sign: zodiacAsc.sign,
    degree: zodiacAsc.degreeStr,
    house: '1',
    retrograde: false,
    element: SIGN_ELEMENTS[zodiacAsc.sign] as any,
    longitude: ascDeg
  });

  // 3. Assign Houses (Equal House System from Ascendant)
  positions.forEach(p => {
    // Determine house based on distance from ASC
    let diff = (p.longitude - ascDeg + 360) % 360;
    const houseNum = Math.floor(diff / 30) + 1;
    p.house = houseNum.toString();
  });

  // 4. Formatting Balance for Chart
  const elementalBalance = [
    { name: 'Fuego', value: balanceCounts.Fuego, fill: '#ef4444' },
    { name: 'Tierra', value: balanceCounts.Tierra, fill: '#10b981' },
    { name: 'Aire', value: balanceCounts.Aire, fill: '#f59e0b' },
    { name: 'Agua', value: balanceCounts.Agua, fill: '#3b82f6' },
  ];

  return { positions, balance: elementalBalance };
}