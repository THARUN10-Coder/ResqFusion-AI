# ResQFusion AI — Full-Stack Disaster Intelligence & Response Platform

> **Tagline:** *"From chaotic disaster reports to intelligent rescue priorities."*

ResQFusion AI is an advanced AI-powered response intelligence layer for emergency command centers and first responders. Official alert systems warn about hazards; ResQFusion continuously ingests, normalizes, deduplicates, detects conflicts in, and prioritizes multi-source ground reports and real-world scientific feeds to tell responders where help is needed most, why, and with what resources.

---

## 🌟 Key Differentiators & Intelligence Pipeline

```text
REAL-WORLD FEEDS (USGS, GDACS, SACHET / NDMA, NASA FIRMS, Citizen Reports)
       │
       ▼
1. CONNECTOR INGESTION & UNIFIED SIGNAL NORMALIZATION
       │
       ▼
2. AI ENTITY EXTRACTION & COMPUTER VISION (NVIDIA NIM / Llama-3.1 & Vision)
       │
       ▼
3. INFORMATION FUSION & DEDUPLICATION (Spatial, Temporal, Semantic Similarity)
       │
       ▼
4. CONFLICT & CONTRADICTION DETECTION (⚠ CONFLICT DETECTED)
       │
       ▼
5. MULTI-TIER SOURCE RELIABILITY & CONFIDENCE SCORING
       │
       ▼
6. DYNAMIC RESCUE PRIORITY SCORING (0 – 100 Normalized)
       │
       ▼
7. EXPLAINABLE AI (XAI) JUSTIFICATION ("Why is this #1?")
       │
       ▼
8. AUTO-DERIVED RESOURCE ALLOCATION & REAL-TIME WEBSOCKET DISPATCH
```

---

## 🏗 Tech Stack

### Frontend
- **Framework:** React 18 + TypeScript + Vite
- **Styling:** Custom CSS Glassmorphism + Dark Emergency Operations Center (EOC) Theme
- **Mapping:** Leaflet + OpenStreetMap (custom dark tiles & dynamic radar pings)
- **Charts:** Recharts (Analytics dashboard)
- **Icons:** Lucide React
- **Real-Time:** WebSockets (`/ws/dashboard`)

### Backend
- **Framework:** Python 3.13 + FastAPI + Pydantic v2
- **Database:** SQLAlchemy ORM (SQLite zero-config local default with PostgreSQL/PostGIS support)
- **AI Engine:** NVIDIA NIM Inference API (`meta/llama-3.1-8b-instruct` for NLP Entity Extraction & `meta/llama-3.2-11b-vision-instruct` for Visual Damage Analysis) + Deterministic Heuristic Fallback
- **Connectors:** USGS Real-Time Earthquakes, GDACS Global Disaster Feeds, SACHET/NDMA CAP Alerts, NASA FIRMS Satellite Fire Detections
- **Testing:** Pytest test suite (`15/15 passed`)

---

## 📡 Live Real-World Disaster Feeds

| Data Source | Status | Source Type | Description |
| :--- | :---: | :---: | :--- |
| **USGS Seismic** | 🟢 `CONNECTED` | `earthquake` | Official USGS Earthquake Hazards Program GeoJSON feed |
| **GDACS Global** | 🟢 `CONNECTED` | `official_global` | Official UN/EC Multi-Hazard Alert RSS XML feed |
| **SACHET / NDMA** | 🟢 `CONNECTED` | `official_india_alert` | Official India Meteorological & CAP Alert Feed |
| **NASA FIRMS** | 🟢 `CONNECTED` | `satellite_fire` | NASA Suomi NPP VIIRS Near-Real-Time Satellite Feed |
| **Citizen Reports** | 🟢 `CONNECTED` | `citizen_report` | Direct citizen distress submissions with AI Entity Extraction |

---

## 🚀 Quick Start & Local Execution

### 1. Backend Setup
```bash
# Navigate to backend directory
cd backend

# Activate Virtual Environment
.\venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Run full test suite (15/15 passed)
$env:PYTHONPATH="."
pytest

# Start FastAPI server
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```
- **Backend API:** `http://127.0.0.1:8000`
- **Swagger Docs:** `http://127.0.0.1:8000/docs`
- **Health Check:** `http://127.0.0.1:8000/api/health`
- **Data Sources:** `http://127.0.0.1:8000/api/data-sources`
- **WebSocket Feed:** `ws://127.0.0.1:8000/ws/dashboard`

### 2. Frontend Setup
```bash
# Navigate to frontend directory
cd frontend

# Install packages
npm install

# Start Vite dev server
npm run dev
```
- **Web Dashboard:** `http://localhost:5173`
