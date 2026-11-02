// Server copy of the currency catalogue used by AI prompts.
const SYMBOLS: Record<string, [string, string]> = {
  NGN: ["₦", "Nigerian Naira"], GHS: ["GH₵", "Ghanaian Cedi"], KES: ["KSh", "Kenyan Shilling"],
  ZAR: ["R", "South African Rand"], EGP: ["E£", "Egyptian Pound"], MAD: ["DH", "Moroccan Dirham"],
  XOF: ["CFA", "West African CFA Franc"], XAF: ["FCFA", "Central African CFA Franc"],
  TZS: ["TSh", "Tanzanian Shilling"], UGX: ["USh", "Ugandan Shilling"], RWF: ["FRw", "Rwandan Franc"],
  ETB: ["Br", "Ethiopian Birr"], ZMW: ["ZK", "Zambian Kwacha"], BWP: ["P", "Botswana Pula"],
  MWK: ["MK", "Malawian Kwacha"], MZN: ["MT", "Mozambican Metical"], AOA: ["Kz", "Angolan Kwanza"],
  DZD: ["DA", "Algerian Dinar"], TND: ["DT", "Tunisian Dinar"], LYD: ["LD", "Libyan Dinar"],
  SDG: ["SDG", "Sudanese Pound"], SSP: ["SSP", "South Sudanese Pound"], CDF: ["FC", "Congolese Franc"],
  BIF: ["FBu", "Burundian Franc"], SOS: ["Sh", "Somali Shilling"], DJF: ["Fdj", "Djiboutian Franc"],
  ERN: ["Nfk", "Eritrean Nakfa"], GMD: ["D", "Gambian Dalasi"], GNF: ["FG", "Guinean Franc"],
  SLE: ["Le", "Sierra Leonean Leone"], LRD: ["L$", "Liberian Dollar"], CVE: ["Esc", "Cape Verdean Escudo"],
  MRU: ["UM", "Mauritanian Ouguiya"], STN: ["Db", "São Tomé Dobra"], NAD: ["N$", "Namibian Dollar"],
  LSL: ["L", "Lesotho Loti"], SZL: ["E", "Eswatini Lilangeni"], ZWG: ["ZiG", "Zimbabwe Gold"],
  MGA: ["Ar", "Malagasy Ariary"], MUR: ["Rs", "Mauritian Rupee"], SCR: ["SR", "Seychellois Rupee"],
  KMF: ["CF", "Comorian Franc"], USD: ["$", "US Dollar"], GBP: ["£", "British Pound"], EUR: ["€", "Euro"],
};

const code = (c?: string | null) => (SYMBOLS[String(c || "NGN").toUpperCase()] ? String(c || "NGN").toUpperCase() : "NGN");

export function formatMoney(n: number, c?: string | null) {
  return `${SYMBOLS[code(c)][0]}${Number(n || 0).toLocaleString()}`;
}

export function currencyGuide(c?: string | null) {
  const k = code(c);
  const [sym, name] = SYMBOLS[k];
  return `CURRENCY:
- This store prices everything in ${name} (${k}, symbol ${sym}). Always quote prices in ${sym} first.
- You understand every African currency (Naira, Cedi, Shilling, Rand, CFA, Birr, Kwacha, Dirham, Pound, etc.) and their slang (e.g. "k" = thousand, "bags", "kobo").
- If the customer names or offers an amount in another currency, convert it to ${k} using your best current estimate, state that it is approximate, and negotiate in ${k}. The order is always paid in ${k}.`;
}
