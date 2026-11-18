import { useState } from "react";
import { api, ApiError } from "../lib/api";
import { Busy, Field, Notice, PageHead, RangeBar } from "../components/ui";
import NotReady from "../components/NotReady";
import { useFarm, num } from "../lib/farm";
import { CROPS, CROP_GUIDE, Factor, cropFit, cropLabel } from "../lib/knowledge";

function Fit({ crop, values }: { crop: string; values: Partial<Record<Factor, number>> }) {
  const fit = cropFit(crop, values);
  const guide = CROP_GUIDE[crop];
  return (
    <div>
      <p className="fit-line">
        <strong>{fit.matched} of {fit.total}</strong> of your conditions are in the usual range for {cropLabel(crop)}.
      </p>
      {fit.rows.map((r) => (
        <RangeBar
          key={r.key}
          label={r.label}
          unit={r.unit}
          value={r.value}
          scale={r.scale}
          band={r.band}
          st={r.st}
          bandNote={`Usual for ${cropLabel(crop)}: ${r.band[0]} to ${r.band[1]}${r.unit ? " " + r.unit : ""}`}
        />
      ))}
      {guide && (
        <div className="guide">
          <h3>Growing {cropLabel(crop)}</h3>
          <p><b>Season:</b> {guide.season}</p>
          <ul className="plain">
            {guide.tips.map((t) => <li key={t}>{t}</li>)}
          </ul>
        </div>
      )}
    </div>
  );
}

export default function CropAdvisor() {
  const { profile, set } = useFarm();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState("");
  const [compare, setCompare] = useState("");

  const values = {
    N: num(profile.N), P: num(profile.P), K: num(profile.K), ph: num(profile.ph),
    temperature: num(profile.temperature), humidity: num(profile.humidity), rainfall: num(profile.rainfall),
  };
  const complete = Object.values(values).every((v) => !Number.isNaN(v));

  async function recommend() {
    setError("");
    if (!complete) {
      setError("Fill in all seven readings. Humidity is the humidity of the air, not soil moisture.");
      return;
    }
    setBusy(true);
    try {
      const res = await api.predictCrop(values);
      setResult(res.recommended_crop);
      set("crop", res.recommended_crop);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Something went wrong. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageHead title="Crop advisor">
        Get the crop that fits your soil and weather, then check how well your field matches what that crop needs.
      </PageHead>
      <NotReady />
      {error && <Notice tone="error">{error}</Notice>}

      <section className="panel">
        <h2>Field conditions</h2>
        <div className="grid-4">
          <Field id="c-N" label="Nitrogen (N)" unit="kg/ha" value={profile.N} onChange={(v) => set("N", v)} />
          <Field id="c-P" label="Phosphorus (P)" unit="kg/ha" value={profile.P} onChange={(v) => set("P", v)} />
          <Field id="c-K" label="Potassium (K)" unit="kg/ha" value={profile.K} onChange={(v) => set("K", v)} />
          <Field id="c-ph" label="Soil pH" value={profile.ph} onChange={(v) => set("ph", v)} />
          <Field id="c-t" label="Temperature" unit="°C" value={profile.temperature} onChange={(v) => set("temperature", v)} />
          <Field id="c-h" label="Air humidity" unit="%" value={profile.humidity} onChange={(v) => set("humidity", v)} />
          <Field id="c-r" label="Rainfall" unit="mm" value={profile.rainfall} onChange={(v) => set("rainfall", v)} hint="Monthly" />
        </div>
        <button className="btn" type="button" onClick={recommend} disabled={busy}>
          {busy ? <Busy label="Finding best crop" /> : "Recommend a crop"}
        </button>
      </section>

      {result && (
        <section className="panel result" aria-live="polite">
          <p className="big-label">Best match for your field</p>
          <p className="big-answer">{cropLabel(result)}</p>
          <Fit crop={result} values={values} />
        </section>
      )}

      {complete && (
        <section className="panel">
          <h2>Thinking of a different crop?</h2>
          <div className="field narrow">
            <label htmlFor="cmp">Check how your field suits</label>
            <select id="cmp" value={compare} onChange={(e) => setCompare(e.target.value)}>
              <option value="">Choose a crop</option>
              {CROPS.map((c) => <option key={c} value={c}>{cropLabel(c)}</option>)}
            </select>
          </div>
          {compare && <Fit crop={compare} values={values} />}
        </section>
      )}
    </>
  );
}
