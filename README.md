# AgriAI frontend

React + TypeScript + Vite app for the AgriAI FastAPI backend. It tackles low farm productivity by giving
farmers soil health information, crop-specific guidance and scientific practices in one place.

## Run it

```bash
npm install
cp .env.example .env     # set VITE_API_URL to your backend (default http://localhost:8000)
npm run dev              # http://localhost:5173
npm run build            # production build in dist/ (Netlify config included)
```

Backend: `uvicorn main:app --host 0.0.0.0 --port 8000` (note: your `procfile.txt` points to `api_server`, which does not exist).

## What each screen does

| Screen | Backend endpoint | Problem it addresses |
|---|---|---|
| My field | `GET /sensor_data`, `GET /health` | Enter readings once (or fill from the ESP32 soil sensor); every tool reuses them |
| Soil health | `POST /fertilizer` | Soil health score, per-nutrient actions, crop-specific healthy ranges |
| Crop advisor | `GET /predict_crop` | Best crop plus fit against that crop's usual ranges, season and growing tips |
| Yield gap | `GET /predict_yield` | Tests N, P, K and pH changes through the model and shows the extra yield each could give |
| Crop doctor | `POST /predict_disease` | Leaf photo to disease, treatment, dose and organic option |
| Irrigation | `POST /irrigation_ai` | Water or hold off, using soil moisture and local weather |

Crop-specific ranges (`src/lib/ranges.ts`) are computed from `Crop_recommendation.csv` (10th to 90th percentile per crop).
Season and tips per crop are in `src/lib/knowledge.ts`; edit them to match your region.

## Backend bugs found (fix these or two screens will fail)

1. **`/fertilizer` returns 500.** `main.py` calls `recommend_fertilizer(N, P, K, crop)`, but the function's 4th
   argument is `ph`, so the crop name gets compared with numbers. Fix in `main.py`:
   ```python
   class FertilizerRequest(BaseModel):
       N: float
       P: float
       K: float
       ph: Optional[float] = None
       crop: str = "general"
   # in the endpoint:
   result = recommend_fertilizer(request.N, request.P, request.K, request.ph)
   ```
2. **`/irrigation_ai` returns 500.** `get_weather()` returns a tuple `(temp, humidity, rain)` but `main.py` treats it as a dict.
   Replace the weather block with:
   ```python
   temperature, humidity, rainfall = get_weather(city)
   ```
3. **Disease severity is always "Mild".** `get_cure(disease_name)` is called without the confidence, so it is 0.
   The frontend ignores severity for this reason.
4. **OpenWeather API key is hard-coded** in `irrigation_model.py` and is now in a zip. Revoke it and load it from an environment variable.
5. **Rainfall units differ between models**: the crop model uses roughly 20 to 300 mm (monthly), the yield model about
   600 to 2000 mm (season). The frontend has separate fields for each.
