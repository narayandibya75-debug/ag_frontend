import { createContext, useCallback, useContext, useEffect, useMemo, useState, ReactNode } from "react";
import { api, API_CONFIGURED, Health, SensorData } from "./api";

export interface Profile {
  N: string; P: string; K: string; ph: string;
  temperature: string; humidity: string; rainfall: string;
  seasonRain: string; moisture: string; city: string; crop: string;
}

const EMPTY: Profile = {
  N: "", P: "", K: "", ph: "", temperature: "", humidity: "", rainfall: "",
  seasonRain: "", moisture: "", city: "", crop: "",
};

const KEY = "agriai.profile.v1";

function load(): Profile {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? { ...EMPTY, ...JSON.parse(raw) } : EMPTY;
  } catch {
    return EMPTY;
  }
}

export const num = (s: string) => (s.trim() === "" ? NaN : Number(s));

interface Ctx {
  profile: Profile;
  set: (k: keyof Profile, v: string) => void;
  clear: () => void;
  sensor: SensorData | null;
  hasSensor: boolean;
  applySensor: () => void;
  health: Health | null;
  healthError: boolean;
}

const FarmContext = createContext<Ctx | null>(null);

export function FarmProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<Profile>(load);
  const [sensor, setSensor] = useState<SensorData | null>(null);
  const [health, setHealth] = useState<Health | null>(null);
  const [healthError, setHealthError] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(profile));
    } catch {
      /* storage unavailable */
    }
  }, [profile]);

  // Poll server health until models are ready, then slowly.
  useEffect(() => {
    if (!API_CONFIGURED) return;
    let stop = false;
    let timer: number;
    const tick = async () => {
      let ready = false;
      try {
        const h = await api.health();
        if (stop) return;
        setHealth(h);
        setHealthError(false);
        ready = h.ready;
      } catch {
        if (!stop) setHealthError(true);
      }
      if (!stop) timer = window.setTimeout(tick, ready ? 60000 : 4000);
    };
    tick();
    return () => {
      stop = true;
      window.clearTimeout(timer);
    };
  }, []);

  // Poll the ESP32 soil sensor values stored on the server.
  useEffect(() => {
    if (!API_CONFIGURED) return;
    let stop = false;
    const tick = async () => {
      try {
        const s = await api.sensor();
        if (!stop) setSensor(s);
      } catch {
        /* backend offline: health banner explains */
      }
    };
    tick();
    const id = window.setInterval(tick, 10000);
    return () => {
      stop = true;
      window.clearInterval(id);
    };
  }, []);

  const set = useCallback((k: keyof Profile, v: string) => setProfile((p) => ({ ...p, [k]: v })), []);
  const clear = useCallback(() => setProfile(EMPTY), []);

  const hasSensor = !!sensor?.updated_at;

  const applySensor = useCallback(() => {
    if (!sensor) return;
    const f = (v: number | null) => (v === null || v === undefined ? undefined : String(v));
    setProfile((p) => ({
      ...p,
      N: f(sensor.N) ?? p.N,
      P: f(sensor.P) ?? p.P,
      K: f(sensor.K) ?? p.K,
      ph: f(sensor.ph) ?? p.ph,
      temperature: f(sensor.temperature) ?? p.temperature,
      moisture: f(sensor.moisture) ?? p.moisture,
      rainfall: f(sensor.rainfall) ?? p.rainfall,
    }));
  }, [sensor]);

  const value = useMemo(
    () => ({ profile, set, clear, sensor, hasSensor, applySensor, health, healthError }),
    [profile, set, clear, sensor, hasSensor, applySensor, health, healthError]
  );

  return <FarmContext.Provider value={value}>{children}</FarmContext.Provider>;
}

export function useFarm() {
  const c = useContext(FarmContext);
  if (!c) throw new Error("useFarm must be used inside FarmProvider");
  return c;
}
