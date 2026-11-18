import { Radio, FlaskConical, Wheat, TrendingUp, Leaf, Droplets, RotateCcw } from "lucide-react";
import { Field, RangeBar, PageHead } from "../components/ui";
import NotReady from "../components/NotReady";
import { useFarm, num } from "../lib/farm";
import { GENERIC, status } from "../lib/knowledge";
import type { Page } from "../App";

const NEXT: { id: Page; icon: typeof Leaf; title: string; text: string }[] = [
  { id: "soil", icon: FlaskConical, title: "Soil health", text: "Find out what your soil is missing and which fertiliser fixes it." },
  { id: "crop", icon: Wheat, title: "Crop advisor", text: "See which crop suits your field, with sowing season and growing tips." },
  { id: "yield", icon: TrendingUp, title: "Yield gap", text: "Compare today's expected yield with what better soil could give." },
  { id: "doctor", icon: Leaf, title: "Crop doctor", text: "Photograph a sick leaf to get the disease and a treatment plan." },
  { id: "water", icon: Droplets, title: "Irrigation", text: "Check whether to water today using soil moisture and the local forecast." },
];

export default function Overview({ go }: { go: (p: Page) => void }) {
  const { profile, set, clear, sensor, hasSensor, applySensor } = useFarm();
  const n = (k: keyof typeof profile) => num(profile[k]);

  return (
    <>
      <PageHead title="Know your field, then grow more from it">
        Enter your soil and weather readings once. Every tool in this app uses them, so you get advice
        for your own field instead of general rules.
      </PageHead>
      <NotReady />

      <div className="split">
        <section className="panel" aria-labelledby="readings-h">
          <div className="panel-head">
            <h2 id="readings-h">Your field readings</h2>
            <button className="btn-quiet" type="button" onClick={clear}>
              <RotateCcw size={16} aria-hidden /> Clear
            </button>
          </div>

          <button className="btn-sensor" type="button" onClick={applySensor} disabled={!hasSensor}>
            <Radio size={18} aria-hidden />
            {hasSensor
              ? `Fill from soil sensor (updated ${new Date(sensor!.updated_at!).toLocaleTimeString()})`
              : "No soil sensor connected yet"}
          </button>

          <div className="grid-2">
            <Field id="N" label="Nitrogen (N)" unit="kg/ha" value={profile.N} onChange={(v) => set("N", v)} />
            <Field id="P" label="Phosphorus (P)" unit="kg/ha" value={profile.P} onChange={(v) => set("P", v)} />
            <Field id="K" label="Potassium (K)" unit="kg/ha" value={profile.K} onChange={(v) => set("K", v)} />
            <Field id="ph" label="Soil pH" value={profile.ph} onChange={(v) => set("ph", v)} hint="From a soil test card. 7 is neutral." />
            <Field id="temperature" label="Temperature" unit="°C" value={profile.temperature} onChange={(v) => set("temperature", v)} />
            <Field id="humidity" label="Air humidity" unit="%" value={profile.humidity} onChange={(v) => set("humidity", v)} />
            <Field id="rainfall" label="Rainfall" unit="mm" value={profile.rainfall} onChange={(v) => set("rainfall", v)} hint="Typical monthly rainfall." />
            <Field id="moisture" label="Soil moisture" unit="%" value={profile.moisture} onChange={(v) => set("moisture", v)} />
          </div>
          <Field id="city" type="text" label="Nearest city or town" value={profile.city} onChange={(v) => set("city", v)} placeholder="For example, Haridwar" hint="Used to fetch today's weather for irrigation advice." />
          <p className="hint">Saved on this device only.</p>
        </section>

        <section className="panel" aria-labelledby="snap-h">
          <h2 id="snap-h">What your readings say</h2>
          {(["N", "P", "K", "ph"] as const).map((k) => {
            const v = n(k);
            const label = k === "ph" ? "Soil pH" : k === "N" ? "Nitrogen" : k === "P" ? "Phosphorus" : "Potassium";
            return (
              <RangeBar
                key={k}
                label={label}
                value={v}
                unit={k === "ph" ? "" : "kg/ha"}
                scale={k === "ph" ? [3.5, 10] : [0, 150]}
                band={GENERIC[k]}
                st={Number.isNaN(v) ? undefined : status(v, GENERIC[k])}
              />
            );
          })}
          <p className="hint">General ranges for most crops. Pick a crop in Soil health for crop-specific ranges.</p>
        </section>
      </div>

      <section aria-labelledby="next-h" className="next">
        <h2 id="next-h">What do you want to work out?</h2>
        <ul className="next-list">
          {NEXT.map(({ id, icon: Icon, title, text }) => (
            <li key={id}>
              <button type="button" onClick={() => go(id)}>
                <Icon size={22} aria-hidden />
                <span>
                  <strong>{title}</strong>
                  <span>{text}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
