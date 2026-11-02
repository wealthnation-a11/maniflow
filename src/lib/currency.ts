// African-first currency catalogue shared by the dashboard, storefront and AI.
export type CurrencyInfo = { code: string; symbol: string; name: string; countries: string[] };

export const CURRENCIES: CurrencyInfo[] = [
  { code: "NGN", symbol: "₦", name: "Nigerian Naira", countries: ["NG"] },
  { code: "GHS", symbol: "GH₵", name: "Ghanaian Cedi", countries: ["GH"] },
  { code: "KES", symbol: "KSh", name: "Kenyan Shilling", countries: ["KE"] },
  { code: "ZAR", symbol: "R", name: "South African Rand", countries: ["ZA", "LS", "NA", "SZ"] },
  { code: "EGP", symbol: "E£", name: "Egyptian Pound", countries: ["EG"] },
  { code: "MAD", symbol: "DH", name: "Moroccan Dirham", countries: ["MA", "EH"] },
  { code: "XOF", symbol: "CFA", name: "West African CFA Franc", countries: ["BJ", "BF", "CI", "GW", "ML", "NE", "SN", "TG"] },
  { code: "XAF", symbol: "FCFA", name: "Central African CFA Franc", countries: ["CM", "CF", "TD", "CG", "GQ", "GA"] },
  { code: "TZS", symbol: "TSh", name: "Tanzanian Shilling", countries: ["TZ"] },
  { code: "UGX", symbol: "USh", name: "Ugandan Shilling", countries: ["UG"] },
  { code: "RWF", symbol: "FRw", name: "Rwandan Franc", countries: ["RW"] },
  { code: "ETB", symbol: "Br", name: "Ethiopian Birr", countries: ["ET"] },
  { code: "ZMW", symbol: "ZK", name: "Zambian Kwacha", countries: ["ZM"] },
  { code: "BWP", symbol: "P", name: "Botswana Pula", countries: ["BW"] },
  { code: "MWK", symbol: "MK", name: "Malawian Kwacha", countries: ["MW"] },
  { code: "MZN", symbol: "MT", name: "Mozambican Metical", countries: ["MZ"] },
  { code: "AOA", symbol: "Kz", name: "Angolan Kwanza", countries: ["AO"] },
  { code: "DZD", symbol: "DA", name: "Algerian Dinar", countries: ["DZ"] },
  { code: "TND", symbol: "DT", name: "Tunisian Dinar", countries: ["TN"] },
  { code: "LYD", symbol: "LD", name: "Libyan Dinar", countries: ["LY"] },
  { code: "SDG", symbol: "SDG", name: "Sudanese Pound", countries: ["SD"] },
  { code: "SSP", symbol: "SSP", name: "South Sudanese Pound", countries: ["SS"] },
  { code: "CDF", symbol: "FC", name: "Congolese Franc", countries: ["CD"] },
  { code: "BIF", symbol: "FBu", name: "Burundian Franc", countries: ["BI"] },
  { code: "SOS", symbol: "Sh", name: "Somali Shilling", countries: ["SO"] },
  { code: "DJF", symbol: "Fdj", name: "Djiboutian Franc", countries: ["DJ"] },
  { code: "ERN", symbol: "Nfk", name: "Eritrean Nakfa", countries: ["ER"] },
  { code: "GMD", symbol: "D", name: "Gambian Dalasi", countries: ["GM"] },
  { code: "GNF", symbol: "FG", name: "Guinean Franc", countries: ["GN"] },
  { code: "SLE", symbol: "Le", name: "Sierra Leonean Leone", countries: ["SL"] },
  { code: "LRD", symbol: "L$", name: "Liberian Dollar", countries: ["LR"] },
  { code: "CVE", symbol: "Esc", name: "Cape Verdean Escudo", countries: ["CV"] },
  { code: "MRU", symbol: "UM", name: "Mauritanian Ouguiya", countries: ["MR"] },
  { code: "STN", symbol: "Db", name: "São Tomé Dobra", countries: ["ST"] },
  { code: "NAD", symbol: "N$", name: "Namibian Dollar", countries: [] },
  { code: "LSL", symbol: "L", name: "Lesotho Loti", countries: [] },
  { code: "SZL", symbol: "E", name: "Eswatini Lilangeni", countries: [] },
  { code: "ZWG", symbol: "ZiG", name: "Zimbabwe Gold", countries: ["ZW"] },
  { code: "MGA", symbol: "Ar", name: "Malagasy Ariary", countries: ["MG"] },
  { code: "MUR", symbol: "Rs", name: "Mauritian Rupee", countries: ["MU"] },
  { code: "SCR", symbol: "SR", name: "Seychellois Rupee", countries: ["SC"] },
  { code: "KMF", symbol: "CF", name: "Comorian Franc", countries: ["KM"] },
  { code: "USD", symbol: "$", name: "US Dollar", countries: ["US"] },
  { code: "GBP", symbol: "£", name: "British Pound", countries: ["GB"] },
  { code: "EUR", symbol: "€", name: "Euro", countries: [] },
];

export function getCurrency(code?: string | null): CurrencyInfo {
  const c = String(code || "NGN").toUpperCase();
  return CURRENCIES.find((x) => x.code === c) || CURRENCIES[0];
}

export function formatMoney(amount: number | string | null | undefined, code?: string | null): string {
  const n = Number(amount || 0);
  const cur = getCurrency(code);
  return `${cur.symbol}${n.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

// Timezone → country, used to guess the visitor's country without asking for location permission.
const TZ_COUNTRY: Record<string, string> = {
  "Africa/Lagos": "NG", "Africa/Accra": "GH", "Africa/Nairobi": "KE", "Africa/Johannesburg": "ZA",
  "Africa/Cairo": "EG", "Africa/Casablanca": "MA", "Africa/Abidjan": "CI", "Africa/Dakar": "SN",
  "Africa/Douala": "CM", "Africa/Dar_es_Salaam": "TZ", "Africa/Kampala": "UG", "Africa/Kigali": "RW",
  "Africa/Addis_Ababa": "ET", "Africa/Lusaka": "ZM", "Africa/Gaborone": "BW", "Africa/Blantyre": "MW",
  "Africa/Maputo": "MZ", "Africa/Luanda": "AO", "Africa/Algiers": "DZ", "Africa/Tunis": "TN",
  "Africa/Tripoli": "LY", "Africa/Khartoum": "SD", "Africa/Juba": "SS", "Africa/Kinshasa": "CD",
  "Africa/Lubumbashi": "CD", "Africa/Bujumbura": "BI", "Africa/Mogadishu": "SO", "Africa/Djibouti": "DJ",
  "Africa/Asmara": "ER", "Africa/Banjul": "GM", "Africa/Conakry": "GN", "Africa/Freetown": "SL",
  "Africa/Monrovia": "LR", "Atlantic/Cape_Verde": "CV", "Africa/Nouakchott": "MR", "Africa/Sao_Tome": "ST",
  "Africa/Windhoek": "NA", "Africa/Maseru": "LS", "Africa/Mbabane": "SZ", "Africa/Harare": "ZW",
  "Indian/Antananarivo": "MG", "Indian/Mauritius": "MU", "Indian/Mahe": "SC", "Indian/Comoro": "KM",
  "Africa/Bamako": "ML", "Africa/Ouagadougou": "BF", "Africa/Niamey": "NE", "Africa/Lome": "TG",
  "Africa/Porto-Novo": "BJ", "Africa/Bissau": "GW", "Africa/Libreville": "GA", "Africa/Brazzaville": "CG",
  "Africa/Bangui": "CF", "Africa/Ndjamena": "TD", "Africa/Malabo": "GQ",
  "Europe/London": "GB", "America/New_York": "US",
};

export function detectVisitorCurrency(): string | null {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    let country = TZ_COUNTRY[tz];
    if (!country) {
      const region = (navigator.language || "").split("-")[1]?.toUpperCase();
      country = region || "";
    }
    if (!country) return null;
    return CURRENCIES.find((c) => c.countries.includes(country))?.code ?? (country.length === 2 && tz.startsWith("Europe/") ? "EUR" : null);
  } catch {
    return null;
  }
}

const rateCache: Record<string, Promise<Record<string, number> | null>> = {};
/** Live exchange rates (free, no key). Returns rates relative to `base`. */
export function fetchRates(base: string): Promise<Record<string, number> | null> {
  const b = base.toUpperCase();
  if (!rateCache[b]) {
    rateCache[b] = fetch(`https://open.er-api.com/v6/latest/${b}`)
      .then((r) => r.json())
      .then((d) => (d?.result === "success" ? (d.rates as Record<string, number>) : null))
      .catch(() => null);
  }
  return rateCache[b];
}
