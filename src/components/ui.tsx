import { ReactNode } from "react";
import { AlertTriangle, Loader2 } from "lucide-react";
import { Status } from "../lib/knowledge";

export function Field(props: {
  id: string; label: string; value: string; onChange: (v: string) => void;
  unit?: string; hint?: string; step?: string; type?: "number" | "text"; placeholder?: string;
}) {
  const { id, label, value, onChange, unit, hint, step = "any", type = "number", placeholder } = props;
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <div className="input-wrap">
        <input
          id={id}
          type={type}
          inputMode={type === "number" ? "decimal" : undefined}
          step={type === "number" ? step : undefined}
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
        />
        {unit && <span className="unit">{unit}</span>}
      </div>
      {hint && <p className="hint">{hint}</p>}
    </div>
  );
}

const WORD: Record<Status, string> = { low: "Low", ok: "In range", high: "High" };

/** A track with the healthy band highlighted and a marker for the farmer's value. */
export function RangeBar(props: {
  label: string; value: number | undefined; unit?: string;
  scale: [number, number]; band: [number, number]; st?: Status; bandNote?: string;
}) {
  const { label, value, unit = "", scale, band, st, bandNote } = props;
  const pct = (v: number) => Math.min(100, Math.max(0, ((v - scale[0]) / (scale[1] - scale[0])) * 100));
  const known = value !== undefined && !Number.isNaN(value);
  const text = known ? `${value}${unit ? " " + unit : ""}` : "no value";
  return (
    <div className="rangebar">
      <div className="rb-head">
        <span className="rb-label">{label}</span>
        <span className="rb-value">
          {text}
          {st && known && <b className={`tag ${st}`}>{WORD[st]}</b>}
        </span>
      </div>
      <div
        className="rb-track"
        role="img"
        aria-label={`${label}: ${text}. Healthy range ${band[0]} to ${band[1]}${unit ? " " + unit : ""}.`}
      >
        <div className="rb-band" style={{ left: `${pct(band[0])}%`, width: `${pct(band[1]) - pct(band[0])}%` }} />
        {known && <div className={`rb-pin ${st ?? ""}`} style={{ left: `${pct(value as number)}%` }} />}
      </div>
      <p className="hint">{bandNote ?? `Healthy range: ${band[0]} to ${band[1]}${unit ? " " + unit : ""}`}</p>
    </div>
  );
}

export function Notice({ tone = "info", children }: { tone?: "info" | "warn" | "error"; children: ReactNode }) {
  return (
    <div className={`notice ${tone}`} role={tone === "error" ? "alert" : "status"}>
      {tone !== "info" && <AlertTriangle size={18} aria-hidden />}
      <div>{children}</div>
    </div>
  );
}

export function Busy({ label }: { label: string }) {
  return (
    <span className="busy">
      <Loader2 size={18} className="spin" aria-hidden /> {label}
    </span>
  );
}

export function PageHead({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <header className="page-head">
      <h1>{title}</h1>
      {children && <p>{children}</p>}
    </header>
  );
}
