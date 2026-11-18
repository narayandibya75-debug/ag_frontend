import { useMemo, useState } from "react";
import { api, ApiError, FertilizerAdvice } from "../lib/api";
import { Busy, Field, Notice, PageHead, RangeBar } from "../components/ui";
import NotReady from "../components/NotReady";
import { useFarm, num } from "../lib/farm";
import { CROPS, CROP_RANGES, GENERIC, Status, cropLabel, status } from "../lib/knowledge";

type Key = "N" | "P" | "K" | "ph";
const NAMES: Record<Key, string> = { N: "Nitrogen", P: "Phosphorus", K: "Potassium", ph: "Soil pH" };

const ACTION: Record<Key, Record<Status, string>> = {
  N: { low: "Apply urea or well-rotted farmyard manure, split over the season.", ok: "No nitrogen needed now.", high: "Skip nitrogen this season. Extra nitrogen makes plants leafy and weak against pests." },
  P: { low: "Apply DAP at sowing, placed close to the roots.", ok: "No phosphorus needed now.", high: "Skip phosphorus. Too much blocks zinc and iron uptake." },
  K: { low: "Apply muriate of potash (MOP) or wood ash.", ok: "No potash needed now.", high: "Skip potash this season." },
  ph: { low: "Soil is acidic. Apply agricultural lime and retest next season.", ok: "pH is suitable.", high: "Soil is alkaline. Apply gypsum and add compost to improve it." },
};

function points(v: number, [lo, hi]: [number, number], isPh: boolean) {
  if (isPh) {
    const dist = v < lo ? lo - v : v > hi ? v - hi : 0;
    return Math.max(0, 25 - 12.5 * dist);
  }
  if (v < lo) return 25 * Math.max(0, v / lo);
  if (v > hi) return 25 * Math.max(0, 1 - (v - hi) / hi);
  return 25;
}

export default function SoilHealth() {
  const { profile, set } = useFarm();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [advice, setAdvice] = useState<FertilizerAdvice | null>(null);
  const [adviceFailed, setAdviceFailed] = useState(false);
  const [done, setDone] = useState(false);

  const crop = profile.crop;
  const vals = { N: num(profile.N), P: num(profile.P), K: num(profile.K), ph: num(profile.ph) };
  const complete = Object.values(vals).every((v) => !Number.isNaN(v));

  const bands = useMemo(() => {
    const out = {} as Record<Key, [number, number]>;
    (["N", "P", "K", "ph"] as Key[]).forEach((k) => {
      const r = crop ? CROP_RANGES[crop]?.[k] : undefined;
      out[k] = r ? [r[0], r[2]] : GENERIC[k];
    });
    return out;
  }, [crop]);

  const rows = (["N", "P", "K", "ph"] as Key[]).map((k) => ({ k, v: vals[k], st: status(vals[k], bands[k]) }));
  const score = Math.round(rows.reduce((s, r) => s + points(r.v, bands[r.k], r.k === "ph"), 0));
  const verdict = score >= 85 ? "Healthy" : score >= 60 ? "Needs attention" : "Poor";

  async function analyse() {
    setError("");
    setAdvice(null);
    setAdviceFailed(false);
    if (!complete) {
      setError("Enter nitrogen, phosphorus, potassium and pH first. You can do this on My field.");
      return;
    }
    setDone(true);
    setBusy(true);
    try {
      const res = await api.fertilizer({ ...vals, crop: crop || "general" });
      setAdvice(res.recommendation);
    } catch (e) {
      setAdviceFailed(true);
      if (e instanceof ApiError && e.status === 0) setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageHead title="Soil health">
        See how your soil compares with what your crop needs, and what to add or skip this season.
      </PageHead>
      <NotReady />
      {error && <Notice tone="error">{error}</Notice>}

      <div className="split">
        <section className="panel">
          <h2>Soil test values</h2>
          <div className="grid-2">
            <Field id="s-N" label="Nitrogen (N)" unit="kg/ha" value={profile.N} onChange={(v) => set("N", v)} />
            <Field id="s-P" label="Phosphorus (P)" unit="kg/ha" value={profile.P} onChange={(v) => set("P", v)} />
            <Field id="s-K" label="Potassium (K)" unit="kg/ha" value={profile.K} onChange={(v) => set("K", v)} />
            <Field id="s-ph" label="Soil pH" value={profile.ph} onChange={(v) => set("ph", v)} />
          </div>
          <div className="field">
            <label htmlFor="s-crop">Crop you plan to grow</label>
            <select id="s-crop" value={crop} onChange={(e) => set("crop", e.target.value)}>
              <option value="">Not decided (use general ranges)</option>
              {CROPS.map((c) => (
                <option key={c} value={c}>{cropLabel(c)}</option>
              ))}
            </select>
            <p className="hint">Choosing a crop switches the ranges below to that crop's usual needs.</p>
          </div>
          <button className="btn" type="button" onClick={analyse} disabled={busy}>
            {busy ? <Busy label="Analysing" /> : "Analyse my soil"}
          </button>
        </section>

        <section className="panel" aria-live="polite">
          <h2>Where each reading sits</h2>
          {rows.map(({ k, v, st }) => (
            <RangeBar
              key={k}
              label={NAMES[k]}
              value={v}
              unit={k === "ph" ? "" : "kg/ha"}
              scale={k === "ph" ? [3.5, 10] : [0, k === "K" ? 210 : 150]}
              band={bands[k]}
              st={Number.isNaN(v) ? undefined : st}
              bandNote={crop ? `Usual range for ${cropLabel(crop)}: ${bands[k][0]} to ${bands[k][1]}` : undefined}
            />
          ))}
        </section>
      </div>

      {done && complete && (
        <section className="panel result" aria-live="polite">
          <div className="score-row">
            <div className={`score ${score >= 85 ? "ok" : score >= 60 ? "mid" : "bad"}`}>
              <strong>{score}</strong>
              <span>out of 100</span>
            </div>
            <div>
              <h2>{verdict} soil{crop ? ` for ${cropLabel(crop)}` : ""}</h2>
              <p className="hint">Score is based on how close nitrogen, phosphorus, potassium and pH are to their healthy ranges.</p>
            </div>
          </div>

          <table className="table">
            <thead>
              <tr><th>Reading</th><th>Status</th><th>What to do</th></tr>
            </thead>
            <tbody>
              {rows.map(({ k, st }) => (
                <tr key={k}>
                  <td>{NAMES[k]}</td>
                  <td><span className={`tag ${st}`}>{st === "ok" ? "In range" : st === "low" ? "Low" : "High"}</span></td>
                  <td>{ACTION[k][st]}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <h3>Fertiliser plan from AgriAI</h3>
          {busy && <Busy label="Getting recommendation" />}
          {advice && (
            <ul className="plain">
              <li><b>Nitrogen:</b> {advice.nitrogen}</li>
              <li><b>Phosphorus:</b> {advice.phosphorus}</li>
              <li><b>Potassium:</b> {advice.potassium}</li>
              {advice.ph && <li><b>pH:</b> {advice.ph}</li>}
              <li><b>Overall:</b> {advice.overall}</li>
            </ul>
          )}
          {adviceFailed && (
            <Notice tone="warn">
              The server could not produce a fertiliser plan right now. The table above still applies.
            </Notice>
          )}
          <p className="hint">Retest your soil every 2 to 3 years, and add compost or farmyard manure each season to build soil health.</p>
        </section>
      )}
    </>
  );
}
