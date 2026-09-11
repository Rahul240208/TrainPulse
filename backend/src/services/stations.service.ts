import { config } from '../config.js';
import type { StationSearchResult } from '../schemas/stations.js';

export const BACKEND_STATIONS_DATA: StationSearchResult[] = [
  { code: 'CDG', name: 'Chandigarh Junction', city: 'Chandigarh', state: 'Chandigarh' },
  { code: 'NDLS', name: 'New Delhi', city: 'New Delhi', state: 'Delhi' },
  { code: 'HWH', name: 'Howrah Junction', city: 'Kolkata', state: 'West Bengal' },
  { code: 'MMCT', name: 'Mumbai Central', city: 'Mumbai', state: 'Maharashtra' },
  { code: 'CSMT', name: 'Chhatrapati Shivaji Maharaj Terminus', city: 'Mumbai', state: 'Maharashtra' },
  { code: 'SBC', name: 'KSR Bengaluru', city: 'Bengaluru', state: 'Karnataka' },
  { code: 'MAS', name: 'MGR Chennai Central', city: 'Chennai', state: 'Tamil Nadu' },
  { code: 'CNB', name: 'Kanpur Central', city: 'Kanpur', state: 'Uttar Pradesh' },
  { code: 'PRYJ', name: 'Prayagraj Junction', city: 'Prayagraj', state: 'Uttar Pradesh' },
  { code: 'BPL', name: 'Bhopal Junction', city: 'Bhopal', state: 'Madhya Pradesh' },
  { code: 'RKMP', name: 'Rani Kamlapati', city: 'Bhopal', state: 'Madhya Pradesh' },
  { code: 'GWL', name: 'Gwalior Junction', city: 'Gwalior', state: 'Madhya Pradesh' },
  { code: 'AGC', name: 'Agra Cantt', city: 'Agra', state: 'Uttar Pradesh' },
  { code: 'VGLJ', name: 'V Lakshmibai Jhansi', city: 'Jhansi', state: 'Uttar Pradesh' },
  { code: 'ADI', name: 'Ahmedabad Junction', city: 'Ahmedabad', state: 'Gujarat' },
  { code: 'GNC', name: 'Gandhinagar Capital', city: 'Gandhinagar', state: 'Gujarat' },
  { code: 'ST', name: 'Surat', city: 'Surat', state: 'Gujarat' },
  { code: 'BRC', name: 'Vadodara Junction', city: 'Vadodara', state: 'Gujarat' },
  { code: 'RTM', name: 'Ratlam Junction', city: 'Ratlam', state: 'Madhya Pradesh' },
  { code: 'KOTA', name: 'Kota Junction', city: 'Kota', state: 'Rajasthan' },
  { code: 'NZM', name: 'Hazrat Nizamuddin', city: 'New Delhi', state: 'Delhi' },
  { code: 'DLI', name: 'Old Delhi Junction', city: 'Delhi', state: 'Delhi' },
  { code: 'SC', name: 'Secunderabad Junction', city: 'Hyderabad', state: 'Telangana' },
  { code: 'HYB', name: 'Hyderabad Deccan', city: 'Hyderabad', state: 'Telangana' },
  { code: 'PNBE', name: 'Patna Junction', city: 'Patna', state: 'Bihar' },
  { code: 'BSB', name: 'Varanasi Junction', city: 'Varanasi', state: 'Uttar Pradesh' },
  { code: 'LKO', name: 'Lucknow Charbagh', city: 'Lucknow', state: 'Uttar Pradesh' },
  { code: 'JP', name: 'Jaipur Junction', city: 'Jaipur', state: 'Rajasthan' },
  { code: 'PUNE', name: 'Pune Junction', city: 'Pune', state: 'Maharashtra' },
  { code: 'GKP', name: 'Gorakhpur Junction', city: 'Gorakhpur', state: 'Uttar Pradesh' },
  { code: 'ASN', name: 'Asansol Junction', city: 'Asansol', state: 'West Bengal' },
  { code: 'DHN', name: 'Dhanbad Junction', city: 'Dhanbad', state: 'Jharkhand' },
  { code: 'GAYA', name: 'Gaya Junction', city: 'Gaya', state: 'Bihar' },
  { code: 'DDU', name: 'Pt. Deen Dayal Upadhyaya', city: 'Mughalsarai', state: 'Uttar Pradesh' },
  { code: 'BVI', name: 'Borivali', city: 'Mumbai', state: 'Maharashtra' },
  { code: 'VAPI', name: 'Vapi', city: 'Vapi', state: 'Gujarat' },
  { code: 'KZJ', name: 'Kazipet Junction', city: 'Warangal', state: 'Telangana' },
  { code: 'BPQ', name: 'Balharshah', city: 'Ballarpur', state: 'Maharashtra' },
  { code: 'RE', name: 'Rewari Junction', city: 'Rewari', state: 'Haryana' },
  { code: 'AWR', name: 'Alwar Junction', city: 'Alwar', state: 'Rajasthan' },
  { code: 'UMB', name: 'Ambala Cantt', city: 'Ambala', state: 'Haryana' },
  { code: 'KLK', name: 'Kalka', city: 'Kalka', state: 'Haryana' },
  { code: 'ASR', name: 'Amritsar Junction', city: 'Amritsar', state: 'Punjab' },
  { code: 'JAT', name: 'Jammu Tawi', city: 'Jammu', state: 'Jammu and Kashmir' },
  { code: 'SVDK', name: 'Shri Mata Vaishno Devi Katra', city: 'Katra', state: 'Jammu and Kashmir' },
  { code: 'GHY', name: 'Guwahati', city: 'Guwahati', state: 'Assam' },
  { code: 'BBS', name: 'Bhubaneswar', city: 'Bhubaneswar', state: 'Odisha' },
  { code: 'NGP', name: 'Nagpur Junction', city: 'Nagpur', state: 'Maharashtra' },
  { code: 'INDB', name: 'Indore Junction', city: 'Indore', state: 'Madhya Pradesh' },
  { code: 'UJN', name: 'Ujjain Junction', city: 'Ujjain', state: 'Madhya Pradesh' },
  { code: 'JU', name: 'Jodhpur Junction', city: 'Jodhpur', state: 'Rajasthan' },
  { code: 'BKN', name: 'Bikaner Junction', city: 'Bikaner', state: 'Rajasthan' },
  { code: 'MAQ', name: 'Mangaluru Central', city: 'Mangaluru', state: 'Karnataka' },
  { code: 'TVC', name: 'Thiruvananthapuram Central', city: 'Thiruvananthapuram', state: 'Kerala' },
  { code: 'ERS', name: 'Ernakulam Junction', city: 'Kochi', state: 'Kerala' },
  { code: 'CBE', name: 'Coimbatore Junction', city: 'Coimbatore', state: 'Tamil Nadu' },
  { code: 'MDU', name: 'Madurai Junction', city: 'Madurai', state: 'Tamil Nadu' },
  { code: 'TPJ', name: 'Tiruchchirappalli Junction', city: 'Tiruchirappalli', state: 'Tamil Nadu' },
  { code: 'BZA', name: 'Vijayawada Junction', city: 'Vijayawada', state: 'Andhra Pradesh' },
  { code: 'VSKP', name: 'Visakhapatnam Junction', city: 'Visakhapatnam', state: 'Andhra Pradesh' },
  { code: 'R', name: 'Raipur Junction', city: 'Raipur', state: 'Chhattisgarh' },
  { code: 'JBP', name: 'Jabalpur Junction', city: 'Jabalpur', state: 'Madhya Pradesh' },
  { code: 'GTL', name: 'Guntakal Junction', city: 'Guntakal', state: 'Andhra Pradesh' },
];

const stationSearchCache = new Map<string, StationSearchResult[]>();

/**
 * Searches stations locally with smart ranking.
 */
export function searchLocalStations(query: string, limit = 10): StationSearchResult[] {
  const clean = query.trim().toUpperCase();
  if (!clean) return BACKEND_STATIONS_DATA.slice(0, limit);

  const exactCodeMatches: StationSearchResult[] = [];
  const prefixCodeMatches: StationSearchResult[] = [];
  const prefixNameMatches: StationSearchResult[] = [];
  const substringMatches: StationSearchResult[] = [];

  for (const station of BACKEND_STATIONS_DATA) {
    const code = station.code.toUpperCase();
    const name = station.name.toUpperCase();
    const city = station.city ? station.city.toUpperCase() : '';

    if (code === clean) {
      exactCodeMatches.push(station);
    } else if (code.startsWith(clean)) {
      prefixCodeMatches.push(station);
    } else if (name.startsWith(clean) || city.startsWith(clean)) {
      prefixNameMatches.push(station);
    } else if (name.includes(clean) || city.includes(clean) || code.includes(clean)) {
      substringMatches.push(station);
    }
  }

  return [
    ...exactCodeMatches,
    ...prefixCodeMatches,
    ...prefixNameMatches,
    ...substringMatches,
  ].slice(0, limit);
}

/**
 * Public service interface for station search.
 * Tries upstream RailRadar if configured, falling back to rich local directory.
 */
export async function searchStations(query: string, limit = 10): Promise<StationSearchResult[]> {
  const clean = query.trim();
  if (clean.length < 2) {
    return [];
  }

  const cacheKey = clean.toUpperCase();
  if (stationSearchCache.has(cacheKey)) {
    return stationSearchCache.get(cacheKey)!;
  }

  const apiKey = config.RAILRADAR_API_KEY;
  const baseUrl = config.RAILRADAR_BASE_URL;

  if (apiKey && apiKey.trim() !== '' && apiKey !== 'your_railradar_api_key_here') {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 4000);

      const response = await fetch(
        `${baseUrl.replace(/\/+$/, '')}/v1/stations/search?q=${encodeURIComponent(clean)}`,
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            Accept: 'application/json',
          },
          signal: controller.signal,
        }
      );
      clearTimeout(timer);

      if (response.ok) {
        const json: any = await response.json();
        const rawStations = Array.isArray(json.data) ? json.data : Array.isArray(json) ? json : [];
        if (rawStations.length > 0) {
          const transformed: StationSearchResult[] = rawStations.map((s: any) => ({
            code: String(s.code || s.stationCode || '').toUpperCase(),
            name: String(s.name || s.stationName || ''),
            city: s.city ? String(s.city) : undefined,
            state: s.state ? String(s.state) : undefined,
          })).filter((s: StationSearchResult) => s.code.length > 0 && s.name.length > 0);

          if (transformed.length > 0) {
            stationSearchCache.set(cacheKey, transformed.slice(0, limit));
            return transformed.slice(0, limit);
          }
        }
      }
    } catch {
      // Fallback to local search on any error or timeout
    }
  }

  const localResults = searchLocalStations(clean, limit);
  stationSearchCache.set(cacheKey, localResults);
  return localResults;
}
