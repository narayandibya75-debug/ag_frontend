import { useEffect, useRef, useState } from "react";
import { Camera, CheckCircle2, ImagePlus } from "lucide-react";
import { api, ApiError, DiseaseResult } from "../lib/api";
import { Busy, Notice, PageHead } from "../components/ui";
import NotReady from "../components/NotReady";

const MAX_MB = 8;

export default function CropDoctor() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [res, setRes] = useState<DiseaseResult | null>(null);
  const [drag, setDrag] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!file) return setPreview("");
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  function pick(f?: File | null) {
    setRes(null);
    setError("");
    if (!f) return;
    if (!f.type.startsWith("image/")) return setError("Please choose a photo (JPG or PNG).");
    if (f.size > MAX_MB * 1024 * 1024) return setError(`That photo is larger than ${MAX_MB} MB. Choose a smaller one.`);
    setFile(f);
  }

  async function scan() {
    if (!file) return;
    setBusy(true);
    setError("");
    try {
      setRes(await api.disease(file));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Something went wrong. Try again.");
    } finally {
      setBusy(false);
    }
  }

  const healthy = res ? /healthy/i.test(res.disease) : false;
  const rows: [string, string][] = res
    ? ([
        ["Spray type", res.cure.pesticide],
        ["Chemical option", res.cure.chemical],
        ["Dose", res.cure.dosage],
        ["How often", res.cure.schedule],
        ["Organic option", res.cure.organic],
      ] as [string, string][]).filter(([, v]) => v && v.trim() !== "-" && v !== "None")
    : [];

  return (
    <>
      <PageHead title="Crop doctor">
        Photograph one affected leaf to find out what is wrong and how to treat it. Works best for tomato, potato
        and pepper, and for common diseases such as blight, mildew and mosaic.
      </PageHead>
      <NotReady />
      {error && <Notice tone="error">{error}</Notice>}

      <div className="split">
        <section className="panel">
          <h2>Leaf photo</h2>
          <div
            className={`drop ${drag ? "drag" : ""}`}
            onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
            onDragLeave={() => setDrag(false)}
            onDrop={(e) => { e.preventDefault(); setDrag(false); pick(e.dataTransfer.files?.[0]); }}
          >
            {preview ? (
              <img src={preview} alt="Selected leaf" />
            ) : (
              <>
                <ImagePlus size={36} aria-hidden />
                <p>Drop a photo here, or choose one below</p>
              </>
            )}
          </div>
          <input ref={input} className="sr-only" type="file" accept="image/*" capture="environment"
            onChange={(e) => pick(e.target.files?.[0])} aria-label="Choose leaf photo" />
          <div className="btn-row">
            <button className="btn-outline" type="button" onClick={() => input.current?.click()}>
              <Camera size={18} aria-hidden /> {file ? "Change photo" : "Take or choose photo"}
            </button>
            <button className="btn" type="button" onClick={scan} disabled={!file || busy}>
              {busy ? <Busy label="Checking leaf" /> : "Check this leaf"}
            </button>
          </div>
          <p className="hint">Use daylight, fill the frame with one leaf, and keep the photo in focus.</p>
        </section>

        <section className="panel" aria-live="polite">
          <h2>Result</h2>
          {!res && <p className="hint">Your diagnosis will appear here.</p>}
          {res && (
            <>
              <div className={`diagnosis ${healthy ? "healthy" : "sick"}`}>
                {healthy && <CheckCircle2 size={26} aria-hidden />}
                <div>
                  <strong>{res.cure.name || res.disease}</strong>
                  <span>{res.confidence.toFixed(0)}% sure</span>
                </div>
              </div>
              {res.confidence < 60 && (
                <Notice tone="warn">The match is weak. Retake the photo in better light, or ask your local agriculture officer to confirm.</Notice>
              )}
              <p className="advice">{res.cure.cure}</p>
              {rows.length > 0 && (
                <dl className="defs">
                  {rows.map(([k, v]) => (
                    <div key={k}><dt>{k}</dt><dd>{v}</dd></div>
                  ))}
                </dl>
              )}
              {!healthy && (
                <p className="hint">Follow the label on the product and wear gloves and a mask when spraying. If it spreads, contact your Krishi Vigyan Kendra.</p>
              )}
            </>
          )}
        </section>
      </div>
    </>
  );
}
