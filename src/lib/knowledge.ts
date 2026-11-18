import { CROP_RANGES, Factor } from "./ranges";

export { CROP_RANGES };
export type { Factor };

export const CROPS = Object.keys(CROP_RANGES).sort();

export const FACTORS: { key: Factor; label: string; unit: string; scale: [number, number] }[] = [
  { key: "N", label: "Nitrogen (N)", unit: "kg/ha", scale: [0, 150] },
  { key: "P", label: "Phosphorus (P)", unit: "kg/ha", scale: [0, 150] },
  { key: "K", label: "Potassium (K)", unit: "kg/ha", scale: [0, 210] },
  { key: "ph", label: "Soil pH", unit: "", scale: [3.5, 10] },
  { key: "temperature", label: "Temperature", unit: "°C", scale: [8, 44] },
  { key: "humidity", label: "Air humidity", unit: "%", scale: [10, 100] },
  { key: "rainfall", label: "Rainfall", unit: "mm", scale: [20, 300] },
];

export const CROP_LABEL: Record<string, string> = {
  kidneybeans: "Kidney beans",
  pigeonpeas: "Pigeon peas",
  mothbeans: "Moth beans",
  mungbean: "Mung bean",
  blackgram: "Black gram",
};

export const cropLabel = (c: string) =>
  CROP_LABEL[c] ?? c.charAt(0).toUpperCase() + c.slice(1);

interface CropGuide {
  season: string;
  tips: string[];
}

export const CROP_GUIDE: Record<string, CropGuide> = {
  rice: { season: "Kharif (monsoon)", tips: ["Transplant 20–25 day old seedlings.", "Keep 2–5 cm of standing water while tillering; alternate wetting and drying saves water without hurting yield."] },
  maize: { season: "Kharif and Rabi", tips: ["Plant on well-drained land; waterlogging for even 2–3 days hurts the crop.", "Split nitrogen into three doses: at sowing, at knee-high stage and at tasseling."] },
  chickpea: { season: "Rabi (winter)", tips: ["Sow in October–November after treating seed with Rhizobium culture.", "Avoid heavy nitrogen; the crop fixes its own. Irrigate at flowering and pod filling."] },
  kidneybeans: { season: "Kharif in hills, Rabi in plains", tips: ["Needs well-drained loam; stagnant water causes root rot.", "Use Rhizobium-treated seed and support climbing types with stakes."] },
  pigeonpeas: { season: "Kharif", tips: ["Deep roots tolerate dry spells. Intercrop with millet, sorghum or soybean.", "Choose wilt-resistant varieties and keep fields weed-free for the first 60 days."] },
  mothbeans: { season: "Kharif", tips: ["Suits sandy, dry areas. Sow with the first monsoon showers.", "Needs very little fertiliser; avoid irrigating at flowering."] },
  mungbean: { season: "Kharif and Zaid (summer)", tips: ["A 60–70 day crop that fits between two main crops.", "Control whiteflies early; they spread yellow mosaic virus."] },
  blackgram: { season: "Kharif and Rabi", tips: ["Treat seed with Rhizobium and keep rows 30 cm apart.", "Scout for yellow mosaic virus and rogue out infected plants."] },
  lentil: { season: "Rabi (winter)", tips: ["Sow October–November in cool, well-drained soil.", "One or two light irrigations (branching and pod filling) are enough."] },
  pomegranate: { season: "Perennial", tips: ["Drip irrigation keeps moisture steady; swings between dry and wet cause fruit cracking.", "Prune for light and air flow, and mulch around the base."] },
  banana: { season: "Perennial (plant year-round with irrigation)", tips: ["A heavy feeder, especially for potassium. Split fertiliser into monthly doses.", "Use drip with fertigation and prop plants against wind."] },
  mango: { season: "Perennial", tips: ["A dry spell before flowering encourages flowering; do not irrigate during bloom.", "Prune and clean the orchard after harvest."] },
  grapes: { season: "Perennial", tips: ["Train on a trellis and prune twice a year.", "Reduce water as berries ripen and protect fruit from rain."] },
  watermelon: { season: "Zaid (summer)", tips: ["Grow on sandy loam with plastic or straw mulch.", "Cut back irrigation as fruit ripens for sweeter fruit."] },
  muskmelon: { season: "Zaid (summer)", tips: ["Use raised beds and drip irrigation to keep leaves dry.", "Stop watering a week before harvest for better sweetness."] },
  apple: { season: "Perennial (cool hills)", tips: ["Needs winter chill; choose varieties matched to your altitude.", "Mulch to hold moisture and keep soil pH between 6 and 7."] },
  orange: { season: "Perennial", tips: ["Avoid waterlogging; plant on raised mounds in heavy soil.", "Watch for zinc and iron deficiency (yellow leaves) and spray micronutrients."] },
  papaya: { season: "Perennial (about 2 years of bearing)", tips: ["Roots rot quickly in standing water, so use raised beds.", "Remove plants showing ring-spot virus early."] },
  coconut: { season: "Perennial", tips: ["Irrigate in dry months; palms need steady water.", "Apply potassium regularly and add organic matter in the basin."] },
  cotton: { season: "Kharif", tips: ["Too much nitrogen gives leafy plants with few bolls.", "Scout weekly for bollworm and whitefly."] },
  jute: { season: "Kharif (sow March–May)", tips: ["Needs warm, humid weather and water nearby for retting.", "Thin plants to 5–7 cm apart at 3 weeks."] },
  coffee: { season: "Perennial (shade grown)", tips: ["Keep 40–50% shade and slightly acidic soil (pH 6–6.5).", "Mulch heavily and prune after harvest."] },
};

export type Status = "low" | "ok" | "high";

export function status(value: number, band: [number, number]): Status {
  if (value < band[0]) return "low";
  if (value > band[1]) return "high";
  return "ok";
}

/** Generic thresholds used by the backend fertilizer logic. */
export const GENERIC = {
  N: [50, 100] as [number, number],
  P: [50, 100] as [number, number],
  K: [50, 100] as [number, number],
  ph: [5.5, 7.5] as [number, number],
};

/** How many of the 7 growing conditions fall in a crop's usual band. */
export function cropFit(crop: string, values: Partial<Record<Factor, number>>) {
  const ranges = CROP_RANGES[crop];
  const rows = FACTORS.map((f) => {
    const r = ranges[f.key];
    const v = values[f.key];
    const known = v !== undefined && !Number.isNaN(v);
    return { ...f, band: [r[0], r[2]] as [number, number], median: r[1], value: v, st: known ? status(v as number, [r[0], r[2]]) : undefined };
  });
  const known = rows.filter((r) => r.st);
  return { rows, matched: known.filter((r) => r.st === "ok").length, total: known.length };
}
