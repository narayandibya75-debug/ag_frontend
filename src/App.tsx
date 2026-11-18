import { useEffect, useState } from "react";
import { Sprout, House, FlaskConical, Wheat, TrendingUp, Leaf, Droplets } from "lucide-react";
import { useFarm } from "./lib/farm";
import Overview from "./pages/Overview";
import SoilHealth from "./pages/SoilHealth";
import CropAdvisor from "./pages/CropAdvisor";
import YieldGap from "./pages/YieldGap";
import CropDoctor from "./pages/CropDoctor";
import Irrigation from "./pages/Irrigation";

export type Page = "field" | "soil" | "crop" | "yield" | "doctor" | "water";

const NAV: { id: Page; label: string; icon: typeof Leaf }[] = [
  { id: "field", label: "My field", icon: House },
  { id: "soil", label: "Soil health", icon: FlaskConical },
  { id: "crop", label: "Crop advisor", icon: Wheat },
  { id: "yield", label: "Yield gap", icon: TrendingUp },
  { id: "doctor", label: "Crop doctor", icon: Leaf },
  { id: "water", label: "Irrigation", icon: Droplets },
];

const fromHash = (): Page => {
  const h = window.location.hash.replace("#", "") as Page;
  return NAV.some((n) => n.id === h) ? h : "field";
};

export default function App() {
  const [page, setPage] = useState<Page>(fromHash);
  const { health, healthError, hasSensor } = useFarm();

  useEffect(() => {
    const on = () => setPage(fromHash());
    window.addEventListener("hashchange", on);
    return () => window.removeEventListener("hashchange", on);
  }, []);

  const go = (p: Page) => {
    window.location.hash = p;
    window.scrollTo({ top: 0 });
  };

  const server = healthError ? "off" : health?.ready ? "on" : "wait";
  const serverText = server === "on" ? "AI ready" : server === "wait" ? "AI starting" : "Server offline";

  return (
    <div className="shell">
      <aside className="side">
        <div className="brand">
          <Sprout size={26} aria-hidden />
          <span>AgriAI</span>
        </div>
        <nav aria-label="Main">
          {NAV.map(({ id, label, icon: Icon }) => (
            <button key={id} type="button" className={page === id ? "active" : ""} aria-current={page === id ? "page" : undefined} onClick={() => go(id)}>
              <Icon size={20} aria-hidden />
              <span>{label}</span>
            </button>
          ))}
        </nav>
        <div className="status">
          <p><i className={`dot ${server}`} />{serverText}</p>
          <p><i className={`dot ${hasSensor ? "on" : "off"}`} />{hasSensor ? "Soil sensor live" : "No soil sensor"}</p>
        </div>
      </aside>

      <main className="main" id="main">
        <div className="content">
          {page === "field" && <Overview go={go} />}
          {page === "soil" && <SoilHealth />}
          {page === "crop" && <CropAdvisor />}
          {page === "yield" && <YieldGap />}
          {page === "doctor" && <CropDoctor />}
          {page === "water" && <Irrigation />}
        </div>
      </main>
    </div>
  );
}
