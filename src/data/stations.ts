export interface Station {
  code: string;
  name: string;
  city: string;
  state: string;
}

export const POPULAR_STATIONS: Station[] = [
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

/**
 * Searches stations by code, name, or city.
 * Ranked: exact code match > code prefix > name prefix > substring match.
 */
export function searchStations(query: string, limit = 8): Station[] {
  const cleanQuery = query.trim().toUpperCase();
  if (!cleanQuery) {
    return POPULAR_STATIONS.slice(0, limit);
  }

  const exactCodeMatches: Station[] = [];
  const prefixCodeMatches: Station[] = [];
  const prefixNameMatches: Station[] = [];
  const substringMatches: Station[] = [];

  for (const station of POPULAR_STATIONS) {
    const code = station.code.toUpperCase();
    const name = station.name.toUpperCase();
    const city = station.city.toUpperCase();

    if (code === cleanQuery) {
      exactCodeMatches.push(station);
    } else if (code.startsWith(cleanQuery)) {
      prefixCodeMatches.push(station);
    } else if (name.startsWith(cleanQuery) || city.startsWith(cleanQuery)) {
      prefixNameMatches.push(station);
    } else if (name.includes(cleanQuery) || city.includes(cleanQuery) || code.includes(cleanQuery)) {
      substringMatches.push(station);
    }
  }

  const combined = [
    ...exactCodeMatches,
    ...prefixCodeMatches,
    ...prefixNameMatches,
    ...substringMatches,
  ];

  return combined.slice(0, limit);
}

/**
 * Finds a station by exact station code (case-insensitive).
 */
export function getStationByCode(code: string): Station | undefined {
  const clean = code.trim().toUpperCase();
  return POPULAR_STATIONS.find((s) => s.code.toUpperCase() === clean);
}
