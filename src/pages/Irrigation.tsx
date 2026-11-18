import { useState } from "react";
import { Droplets, Thermometer, Wind, CloudRain } from "lucide-react";
import { api, ApiError, IrrigationResult } from "../lib/api";
import { Busy, Field, Notice, PageHead } from "../components/ui";
import NotReady from "../components/NotReady";
import { useFarm, num } from "../lib/farm";

export default function Irrigation() {
  const { profile, set } = useFarm();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [res, setRes] = useState<IrrigationResult | null>(null);

  async function run() {
    setError("");
    setRes(null);
    const moisture = num(profile.moisture);
    const ph = num(profile.ph);
    if (Number.isNaN(moisture) || moisture < 0 || moisture > 100) {
      setError("Enter soil moisture as a percentage between 0 and 100.");
      return;
    }
    if (Number.isNaN(ph)) {
      setError("Enter your soil pH.");
      return;
    }
    if (!profile.city.trim()) {
      setError("Enter your nearest city or town so we can check today's weather.");
      return;
    }
    setBusy(true);
    try {
      setRes(await api.irrigation({ moisture, ph, city: profile.city.trim() }));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Something went wrong. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageHead title="Irrigation">
        Decide whether to water today, using your soil moisture and the current weather in your area.
      </PageHead>
      <NotReady />
      {error && <Notice tone="error">{error}</Notice>}

      <section className="panel">
        <h2>Today's check</h2>
        <div className="grid-3">
          <Field id="i-m" label="Soil moisture" unit="%" value={profile.moisture} onChange={(v) => set("moisture", v)} />
          <Field id="i-ph" label="Soil pH" value={profile.ph} onChange={(v) => set("ph", v)} />
          <Field id="i-c" type="text" label="Nearest city or town" value={profile.city} onChange={(v) => set("city", v)} placeholder="For example, Haridwar" />
        </div>
        <button className="btn" type="button" onClick={run} disabled={busy}>
          {busy ? <Busy label="Checking weather" /> : "Should I water today?"}
        </button>
      </section>

      {res && (
        <section className="panel result" aria-live="polite">
          <div className={`verdict ${res.irrigation === "ON" ? "on" : "off"}`}>
            <Droplets size={34} aria-hidden />
            <div>
              <strong>{res.irrigation === "ON" ? "Water your field today" : "Hold off on watering"}</strong>
              <span>{res.reason}</span>
            </div>
          </div>
          <ul className="tiles">
            <li><Thermometer size={18} aria-hidden /><b>{res.temperature.toFixed(1)} °C</b><span>Temperature in {res.city}</span></li>
            <li><Wind size={18} aria-hidden /><b>{res.humidity.toFixed(0)}%</b><span>Air humidity</span></li>
            <li><CloudRain size={18} aria-hidden /><b>{res.rainfall.toFixed(1)} mm</b><span>Rain in the last hour</span></li>
            <li><Droplets size={18} aria-hidden /><b>{res.moisture.toFixed(0)}%</b><span>Soil moisture</span></li>
          </ul>
        </section>
      )}
    </>
  );
}
