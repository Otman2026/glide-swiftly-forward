// Geographic reference data for transport scope (local / national / international)
// Focused on Morocco + main international partners. Extend as needed.

export type Country = { code: string; name_ar: string; name_en: string };
export type CityMap = Record<string, string[]>; // country code -> city names (Arabic)

export const COUNTRIES: Country[] = [
  { code: "MA", name_ar: "المغرب", name_en: "Morocco" },
  { code: "DZ", name_ar: "الجزائر", name_en: "Algeria" },
  { code: "TN", name_ar: "تونس", name_en: "Tunisia" },
  { code: "LY", name_ar: "ليبيا", name_en: "Libya" },
  { code: "MR", name_ar: "موريتانيا", name_en: "Mauritania" },
  { code: "EG", name_ar: "مصر", name_en: "Egypt" },
  { code: "SN", name_ar: "السنغال", name_en: "Senegal" },
  { code: "ML", name_ar: "مالي", name_en: "Mali" },
  { code: "ES", name_ar: "إسبانيا", name_en: "Spain" },
  { code: "FR", name_ar: "فرنسا", name_en: "France" },
  { code: "IT", name_ar: "إيطاليا", name_en: "Italy" },
  { code: "DE", name_ar: "ألمانيا", name_en: "Germany" },
  { code: "BE", name_ar: "بلجيكا", name_en: "Belgium" },
  { code: "NL", name_ar: "هولندا", name_en: "Netherlands" },
  { code: "PT", name_ar: "البرتغال", name_en: "Portugal" },
  { code: "GB", name_ar: "المملكة المتحدة", name_en: "United Kingdom" },
  { code: "SA", name_ar: "السعودية", name_en: "Saudi Arabia" },
  { code: "AE", name_ar: "الإمارات", name_en: "UAE" },
];

export const CITIES: CityMap = {
  MA: [
    "الدار البيضاء","الرباط","سلا","تمارة","القنيطرة","طنجة","تطوان","العرائش","أصيلة",
    "فاس","مكناس","تازة","إفران","خنيفرة","بني ملال","خريبكة","سطات","برشيد","الجديدة",
    "آسفي","مراكش","قلعة السراغنة","الرشيدية","ورززات","زاكورة","أكادير","تارودانت",
    "تزنيت","كلميم","العيون","الداخلة","الحسيمة","الناضور","وجدة","بركان","جرادة",
  ],
  DZ: ["الجزائر العاصمة","وهران","قسنطينة","عنابة","تلمسان","سطيف","باتنة"],
  TN: ["تونس","صفاقس","سوسة","القيروان","بنزرت","قابس"],
  LY: ["طرابلس","بنغازي","مصراتة","سبها"],
  MR: ["نواكشوط","نواذيبو","روصو"],
  EG: ["القاهرة","الإسكندرية","الجيزة","بورسعيد","السويس"],
  SN: ["داكار","تييس","سان لويس"],
  ML: ["باماكو","سيكاسو","موبتي"],
  ES: ["مدريد","برشلونة","فالنسيا","إشبيلية","سرقسطة","مالقة","الجزيرة الخضراء","طريفة","مورسية"],
  FR: ["باريس","مرسيليا","ليون","تولوز","نيس","نانت","ستراسبورغ","بوردو","ليل"],
  IT: ["روما","ميلانو","نابولي","تورينو","جنوة","بولونيا"],
  DE: ["برلين","هامبورغ","ميونخ","كولونيا","فرانكفورت"],
  BE: ["بروكسل","أنتويرب","لييج","غنت"],
  NL: ["أمستردام","روتردام","لاهاي","أوتريخت"],
  PT: ["لشبونة","بورتو","براغا","فارو"],
  GB: ["لندن","مانشستر","برمنغهام","ليفربول","غلاسكو"],
  SA: ["الرياض","جدة","مكة","المدينة","الدمام"],
  AE: ["دبي","أبوظبي","الشارقة","العين"],
};

export const DEFAULT_COUNTRY = "MA";

export function getCountry(code?: string | null): Country | undefined {
  if (!code) return undefined;
  return COUNTRIES.find((c) => c.code === code);
}

export function citiesOf(code?: string | null): string[] {
  if (!code) return [];
  return CITIES[code] ?? [];
}

export function scopeFor(
  originCountry?: string | null,
  destCountry?: string | null,
  originCity?: string | null,
  destCity?: string | null,
): "local" | "national" | "international" {
  if (originCountry && destCountry && originCountry !== destCountry) return "international";
  if (originCity && destCity && originCity !== destCity) return "national";
  return "local";
}

export const SCOPE_LABELS: Record<"local" | "national" | "international", string> = {
  local: "محلي",
  national: "وطني",
  international: "دولي",
};

export const SCOPE_TONES: Record<"local" | "national" | "international", "info" | "success" | "warning"> = {
  local: "info",
  national: "success",
  international: "warning",
};
