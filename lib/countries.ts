export type Country = {
  code: string;
  name: string;
  regionLabel: string;
  regions: string[];
};

/**
 * Local country/region dataset — the plan explicitly removes Google Maps and
 * any country/state API. Nigeria, USA, Canada and UK carry complete official
 * lists; other major markets carry curated administrative divisions.
 */
export const COUNTRIES: Country[] = [
  {
    code: "NG",
    name: "Nigeria",
    regionLabel: "State",
    regions: [
      "FCT Abuja",
      "Abia", "Adamawa", "Akwa Ibom", "Anambra", "Bauchi", "Bayelsa", "Benue",
      "Borno", "Cross River", "Delta", "Ebonyi", "Edo", "Ekiti", "Enugu",
      "Gombe", "Imo", "Jigawa", "Kaduna", "Kano", "Katsina", "Kebbi", "Kogi",
      "Kwara", "Lagos", "Nasarawa", "Niger", "Ogun", "Ondo", "Osun", "Oyo",
      "Plateau", "Rivers", "Sokoto", "Taraba", "Yobe", "Zamfara",
    ],
  },
  {
    code: "US",
    name: "United States",
    regionLabel: "State",
    regions: [
      "Alabama", "Alaska", "Arizona", "Arkansas", "California", "Colorado",
      "Connecticut", "Delaware", "Florida", "Georgia", "Hawaii", "Idaho",
      "Illinois", "Indiana", "Iowa", "Kansas", "Kentucky", "Louisiana", "Maine",
      "Maryland", "Massachusetts", "Michigan", "Minnesota", "Mississippi",
      "Missouri", "Montana", "Nebraska", "Nevada", "New Hampshire",
      "New Jersey", "New Mexico", "New York", "North Carolina", "North Dakota",
      "Ohio", "Oklahoma", "Oregon", "Pennsylvania", "Rhode Island",
      "South Carolina", "South Dakota", "Tennessee", "Texas", "Utah", "Vermont",
      "Virginia", "Washington", "West Virginia", "Wisconsin", "Wyoming",
    ],
  },
  {
    code: "CA",
    name: "Canada",
    regionLabel: "Province / Territory",
    regions: [
      "Alberta", "British Columbia", "Manitoba", "New Brunswick",
      "Newfoundland and Labrador", "Northwest Territories", "Nova Scotia",
      "Nunavut", "Ontario", "Prince Edward Island", "Quebec", "Saskatchewan",
      "Yukon",
    ],
  },
  {
    code: "GB",
    name: "United Kingdom",
    regionLabel: "Country",
    regions: ["England", "Scotland", "Wales", "Northern Ireland"],
  },
  {
    code: "ZA",
    name: "South Africa",
    regionLabel: "Province",
    regions: [
      "Eastern Cape", "Free State", "Gauteng", "KwaZulu-Natal", "Limpopo",
      "Mpumalanga", "North West", "Northern Cape", "Western Cape",
    ],
  },
  {
    code: "GH",
    name: "Ghana",
    regionLabel: "Region",
    regions: [
      "Ashanti", "Bono", "Bono East", "Central", "Eastern", "Greater Accra",
      "North East", "Northern", "Oti", "Savannah", "Upper East", "Upper West",
      "Volta", "Western", "Western North", "Ahafo",
    ],
  },
  {
    code: "KE",
    name: "Kenya",
    regionLabel: "County",
    regions: [
      "Nairobi", "Mombasa", "Kisumu", "Nakuru", "Uasin Gishu", "Machakos",
      "Kiambu", "Kajiado", "Meru", "Kilifi", "Kisii", "Bungoma", "Kakamega",
      "Garissa", "Turkana", "Kericho", "Nyeri", "Embu", "Eldoret (Uasin Gishu)",
      "Lamu",
    ],
  },
  {
    code: "IN",
    name: "India",
    regionLabel: "State",
    regions: [
      "Andhra Pradesh", "Assam", "Bihar", "Chhattisgarh", "Delhi", "Goa",
      "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka",
      "Kerala", "Madhya Pradesh", "Maharashtra", "Odisha", "Punjab",
      "Rajasthan", "Tamil Nadu", "Telangana", "Uttar Pradesh", "Uttarakhand",
      "West Bengal",
    ],
  },
  {
    code: "AE",
    name: "United Arab Emirates",
    regionLabel: "Emirate",
    regions: [
      "Abu Dhabi", "Dubai", "Sharjah", "Ajman", "Umm Al Quwain", "Ras Al Khaimah", "Fujairah",
    ],
  },
  {
    code: "SA",
    name: "Saudi Arabia",
    regionLabel: "Province",
    regions: [
      "Riyadh", "Makkah", "Madinah", "Eastern Province", "Asir", "Tabuk",
      "Hail", "Northern Borders", "Jazan", "Najran", "Al-Baha", "Al-Jouf", "Qassim",
    ],
  },
  {
    code: "EG",
    name: "Egypt",
    regionLabel: "Governorate",
    regions: [
      "Cairo", "Giza", "Alexandria", "Qalyubia", "Sharqia", "Dakahlia",
      "Beheira", "Minya", "Asyut", "Sohag", "Qena", "Luxor", "Aswan", "Red Sea",
      "Suez", "Ismailia", "Port Said", "Damietta", "Fayoum", "Beni Suef",
      "Matrouh", "New Valley", "Kafr El Sheikh", "Gharbia", "Monufia", "North Sinai", "South Sinai",
    ],
  },
  {
    code: "DE",
    name: "Germany",
    regionLabel: "State",
    regions: [
      "Baden-Württemberg", "Bavaria", "Berlin", "Brandenburg", "Bremen",
      "Hamburg", "Hesse", "Lower Saxony", "Mecklenburg-Vorpommern",
      "North Rhine-Westphalia", "Rhineland-Palatinate", "Saarland", "Saxony",
      "Saxony-Anhalt", "Schleswig-Holstein", "Thuringia",
    ],
  },
  {
    code: "FR",
    name: "France",
    regionLabel: "Region",
    regions: [
      "Île-de-France", "Provence-Alpes-Côte d'Azur", "Auvergne-Rhône-Alpes",
      "Nouvelle-Aquitaine", "Occitanie", "Hauts-de-France", "Grand Est",
      "Normandy", "Brittany", "Pays de la Loire", "Centre-Val de Loire",
      "Bourgogne-Franche-Comté", "Corsica",
    ],
  },
  {
    code: "ES",
    name: "Spain",
    regionLabel: "Region",
    regions: [
      "Madrid", "Catalonia", "Andalusia", "Valencia", "Galicia", "Basque Country",
      "Castile and León", "Aragon", "Castilla-La Mancha", "Murcia", "Asturias",
      "Navarre", "Extremadura", "Canary Islands", "Balearic Islands",
      "Cantabria", "La Rioja",
    ],
  },
  {
    code: "IT",
    name: "Italy",
    regionLabel: "Region",
    regions: [
      "Lombardy", "Lazio", "Campania", "Sicily", "Veneto", "Piedmont",
      "Emilia-Romagna", "Tuscany", "Apulia", "Calabria", "Liguria", "Marche",
      "Abruzzo", "Sardinia", "Friuli-Venezia Giulia", "Umbria", "Trentino-Alto Adige",
      "Basilicata", "Molise", "Aosta Valley",
    ],
  },
  {
    code: "AU",
    name: "Australia",
    regionLabel: "State / Territory",
    regions: [
      "New South Wales", "Victoria", "Queensland", "Western Australia",
      "South Australia", "Tasmania", "Australian Capital Territory", "Northern Territory",
    ],
  },
  {
    code: "BR",
    name: "Brazil",
    regionLabel: "State",
    regions: [
      "São Paulo", "Rio de Janeiro", "Minas Gerais", "Bahia", "Paraná",
      "Rio Grande do Sul", "Pernambuco", "Ceará", "Goiás", "Amazonas",
      "Pará", "Distrito Federal",
    ],
  },
  {
    code: "MX",
    name: "Mexico",
    regionLabel: "State",
    regions: [
      "Ciudad de México", "Jalisco", "Nuevo León", "Estado de México",
      "Puebla", "Guanajuato", "Yucatán", "Quintana Roo", "Baja California",
      "Sonora", "Chihuahua", "Veracruz", "Oaxaca", "Michoacán", "Sinaloa", "Tamaulipas",
    ],
  },
  {
    code: "JP",
    name: "Japan",
    regionLabel: "Prefecture",
    regions: [
      "Tokyo", "Osaka", "Kanagawa", "Aichi", "Hokkaido", "Fukuoka", "Kyoto",
      "Hyogo", "Saitama", "Chiba", "Hiroshima", "Miyagi", "Shizuoka", "Ibaraki",
      "Gunma", "Niigata", "Okinawa", "Kumamoto", "Okayama", "Nagano",
    ],
  },
  {
    code: "CN",
    name: "China",
    regionLabel: "Province",
    regions: [
      "Beijing", "Shanghai", "Guangdong", "Jiangsu", "Zhejiang", "Sichuan",
      "Hubei", "Fujian", "Shandong", "Henan", "Hunan", "Chongqing", "Tianjin",
      "Shaanxi", "Liaoning",
    ],
  },
  {
    code: "TR",
    name: "Turkey",
    regionLabel: "Province",
    regions: [
      "Istanbul", "Ankara", "Izmir", "Antalya", "Bursa", "Adana", "Gaziantep",
      "Konya", "Mersin", "Samsun", "Trabzon", "Kayseri", "Eskişehir", "Muğla", "Hatay",
    ],
  },
  {
    code: "NL",
    name: "Netherlands",
    regionLabel: "Province",
    regions: [
      "North Holland", "South Holland", "Utrecht", "North Brabant", "Gelderland",
      "Overijssel", "Friesland", "Groningen", "Drenthe", "Zeeland", "Flevoland", "Limburg",
    ],
  },
  {
    code: "SE",
    name: "Sweden",
    regionLabel: "County",
    regions: [
      "Stockholm", "Västra Götaland", "Skåne", "Uppsala", "Östergötland",
      "Jönköping", "Halland", "Dalarna", "Värmland", "Norrbotten",
    ],
  },
  {
    code: "CH",
    name: "Switzerland",
    regionLabel: "Canton",
    regions: [
      "Zürich", "Bern", "Geneva", "Vaud", "Basel-Stadt", "Basel-Landschaft",
      "Lucerne", "St. Gallen", "Ticino", "Aargau", "Valais", "Fribourg", "Neuchâtel",
    ],
  },
  {
    code: "SG",
    name: "Singapore",
    regionLabel: "Region",
    regions: ["Central", "East", "North", "North-East", "West"],
  },
  {
    code: "MY",
    name: "Malaysia",
    regionLabel: "State",
    regions: [
      "Selangor", "Kuala Lumpur", "Johor", "Penang", "Perak", "Sabah", "Sarawak",
      "Pahang", "Kedah", "Negeri Sembilan", "Malacca", "Terengganu", "Kelantan", "Perlis",
    ],
  },
  {
    code: "ZZ",
    name: "Other (not listed)",
    regionLabel: "Region",
    regions: [],
  },
];

export function getCountry(code: string): Country | undefined {
  return COUNTRIES.find((c) => c.code === code);
}
