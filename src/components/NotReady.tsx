import { useFarm } from "../lib/farm";
import { API_CONFIGURED } from "../lib/api";
import { Notice } from "./ui";

/** Shown above forms when the backend is offline or still loading its models. */
export default function NotReady() {
  const { health, healthError } = useFarm();
  if (!API_CONFIGURED)
    return (
      <Notice tone="error">
        The backend address is not configured, so predictions are unavailable. Set VITE_API_URL in the Netlify
        site settings (Environment variables) and redeploy.
      </Notice>
    );
  if (healthError)
    return (
      <Notice tone="error">
        The server is not responding. It may be waking up (free hosting sleeps when idle). Retrying automatically.
      </Notice>
    );
  if (health && !health.ready)
    return (
      <Notice tone="warn">
        The AI models are loading ({health.status}). Predictions will work in a minute or two.
        {health.error && <> Server reported: {health.error}</>}
      </Notice>
    );
  return null;
}
