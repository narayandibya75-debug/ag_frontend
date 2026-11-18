import { useState } from "react";
import { api, ApiError, YieldInput } from "../lib/api";
import { Busy, Field, Notice, PageHead } from "../components/ui";
import NotReady from "../components/NotReady";
import { useFarm, num } from "../lib/farm";

type Lever = "N" | "P" | "K" | "ph";

// Values tested for each lever; they stay inside the ranges the yield model was trained on.
const LEVERS: { key: Lever; label: string; unit: string; points: number[] }[] = [
  { key: "N", label: "Nitrogen", unit: "kg/ha", points: [30, 45, 60, 70, 80] },
  { key: "P", label: "Phosphorus", unit: "kg/ha", points: [20, 35, 50, 60, 70] },
  { key: "K", label: "Potassium", unit: "kg/ha", points: [15, 30, 40, 50, 60] },
  { key: "ph", label: "Soil pH", unit: "", points: [5.5, 6, 6.5, 7, 7.5] },
];

interface Outcome {
  now: number;
  potential: number;
  steps: { key: Lever; label: string; unit: string; from: number; to: number; gain: number }[];
}

const MIN_GAIN = 0.05;

export default function YieldGap() {
  const { profile, set } = useFarm();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [out, setOut] = useState<Outcome | null>(null);

  const base: YieldInput = {
    temperature: num(profile.temperature), rainfall: num(profile.seasonRain),
    ph: num(profile.ph), N: num(profile.N), P: num(profile.P), K: num(profile.K),
  };

  async function run() {
    setError("");
    setOut(null);
    if (Object.values(base).some((v) => Number.isNaN(v))) {
      setError("Fill in all six values to estimate your yield.");
      return;
    }
    setBusy(true);
    try {
      const predict = async (p: YieldInput) => (await api.predictYield(p)).predicted_yield;
      const now = await predict(base);

      const tested = await Promise.all(
        LEVERS.map(async (l) => {
          const results = await Promise.all(
            l.points.map(async (pt) => ({ pt, y: await predict({ ...base, [l.key]: pt }) }))
          );
          const best = results.reduce((a, b) => (b.y > a.y ? b : a));
          return { ...l, from: base[l.key], to: best.pt, gain: best.y - now };
        })
      );

      const useful = tested.filter((t) => t.gain >= MIN_GAIN).sort((a, b) => b.gain - a.gain);
      let potential = now;
      if (useful.length) {
        const combined = { ...base };
        useful.forEach((u) => (combined[u.key] = u.to));
        potential = Math.max(now, await predict(combined));
      }
      setOut({ now, potential, steps: useful });
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Something went wrong. Try again.");
    } finally {
      setBusy(false);
    }
  }

  const top = out ? Math.max(out.potential * 1.15, 1) : 1;
  const gap = out ? out.potential - out.now : 0;

  return (
    <>
      <PageHead title="Yield gap">
        Estimate your expected yield, then see which soil changes could raise it and by how much.
      </PageHead>
      <NotReady />
      {error && <Notice tone="error">{error}</Notice>}

      <section className="panel">
        <h2>Growing conditions</h2>
        <div className="grid-3">
          <Field id="y-t" label="Average temperature" unit="°C" value={profile.temperature} onChange={(v) => set("temperature", v)} />
          <Field id="y-r" label="Rainfall in the growing season" unit="mm" value={profile.seasonRain} onChange={(v) => set("seasonRain", v)} hint="Total for the whole season, not a month." />
          <Field id="y-ph" label="Soil pH" value={profile.ph} onChange={(v) => set("ph", v)} />
          <Field id="y-N" label="Nitrogen (N)" unit="kg/ha" value={profile.N} onChange={(v) => set("N", v)} />
          <Field id="y-P" label="Phosphorus (P)" unit="kg/ha" value={profile.P} onChange={(v) => set("P", v)} />
          <Field id="y-K" label="Potassium (K)" unit="kg/ha" value={profile.K} onChange={(v) => set("K", v)} />
        </div>
        <button className="btn" type="button" onClick={run} disabled={busy}>
          {busy ? <Busy label="Testing soil changes" /> : "Estimate my yield gap"}
        </button>
      </section>

      {out && (
        <section className="panel result" aria-live="polite">
          <h2>{gap >= MIN_GAIN ? `You could gain about ${gap.toFixed(1)} t/ha` : "Your soil is already close to its best"}</h2>
          <div className="yield-bars">
            <div className="ybar-row">
              <span>Expected now</span>
              <div className="ybar"><i style={{ width: `${(out.now / top) * 100}%` }} /></div>
              <b>{out.now.toFixed(2)} t/ha</b>
            </div>
            <div className="ybar-row">
              <span>With the changes below</span>
              <div className="ybar potential"><i style={{ width: `${(out.potential / top) * 100}%` }} /></div>
              <b>{out.potential.toFixed(2)} t/ha</b>
            </div>
          </div>

          {out.steps.length > 0 ? (
            <>
              <h3>What to change, biggest gain first</h3>
              <table className="table">
                <thead><tr><th>Change</th><th>From</th><th>To</th><th>Extra yield</th></tr></thead>
                <tbody>
                  {out.steps.map((s) => (
                    <tr key={s.key}>
                      <td>{s.to > s.from ? "Raise" : "Lower"} {s.label.toLowerCase()}</td>
                      <td>{s.from} {s.unit}</td>
                      <td>{s.to} {s.unit}</td>
                      <td>+{s.gain.toFixed(2)} t/ha</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="hint">Use Soil health to see which fertiliser or soil amendment gets each value there.</p>
            </>
          ) : (
            <p>No single change to nitrogen, phosphorus, potassium or pH gives a meaningful gain. Look at water, seed quality and disease next.</p>
          )}
          <p className="hint">
            This is a model estimate from 300 sample farms, so treat it as a guide. Only soil values are changed;
            temperature and rainfall stay as you entered them.
          </p>
        </section>
      )}
    </>
  );
}
