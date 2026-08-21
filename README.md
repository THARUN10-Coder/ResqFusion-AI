# ResQFusion AI — Full-Stack Disaster Intelligence & Response Platform

> **Tagline:** *"From chaotic disaster reports to intelligent rescue priorities."*

ResQFusion AI is an advanced AI-powered response intelligence layer for emergency command centers and first responders. Official alert systems warn about hazards; ResQFusion processes, deduplicates, detects conflicts in, and prioritizes multi-source ground reports to tell responders where help is needed most, why, and with what resources.

---

## 🌟 Key Differentiators & Intelligence Pipeline

```text
CHAOTIC MULTI-SOURCE REPORTS (Citizen App, SACHET, News, Social)
       │
       ▼
1. AI ENTITY EXTRACTION & IMAGE ANALYSIS
       │
       ▼
2. INFORMATION FUSION & DEDUPLICATION (Spatial, Temporal, Semantic Similarity)
       │
       ▼
3. CONFLICT & CONTRADICTION DETECTION (⚠ CONFLICT DETECTED)
       │
       ▼
4. SOURCE RELIABILITY & CONFIDENCE SCORING
       │
       ▼
5. DYNAMIC RESCUE PRIORITY SCORING (0 – 100 Normalized)
       │
       ▼
6. EXPLAINABLE AI (XAI) JUSTIFICATION ("Why is this #1?")
       │
       ▼
7. AUTO-DERIVED RESOURCE ALLOCATION & REAL-TIME WEBSOCKET DISPATCH
```

---

## 🏗 Tech Stack

### Frontend
- **Framework:** React 18 + TypeScript + Vite
- **Styling:** Tailwind CSS + Dark Emergency Operations Center (EOC) Theme
- **Mapping:** Leaflet + OpenStreetMap (custom dark tiles & severity markers)
- **Charts:** Recharts (Analytics dashboard)
- **Icons:** Lucide React
- **Real-Time:** WebSockets (`/ws/dashboard`)

### Backend
- **Framework:** Python 3.13 + FastAPI + Pydantic v2
- **Database:** SQLAlchemy ORM (SQLite zero-config local default with PostgreSQL/PostGIS support)
- **AI Engine:** Modular `AIProvider` abstraction with zero-key **Deterministic Local AI Engine** + OpenAI / Gemini LLM API options
- **Testing:** Pytest test suite (`10/10 passed`)

---

## 🚀 Quick Start & Local Execution

### Option A: Manual Development Mode

#### 1. Backend Setup
```bash
# Navigate to backend directory
cd backend

# Activate Virtual Environment (or create: py -3 -m venv venv)
venv/Scripts/activate

# Install dependencies
pip install -r requirements.txt

# Start FastAPI server with live reload & seed database
uvicorn app.main:app --reload --port 8000
```
- **Backend API:** `http://localhost:8000`
- **Swagger Docs:** `http://localhost:8000/docs`
- **WebSocket Feed:** `ws://localhost:8000/ws/dashboard`

#### 2. Run Backend Tests
```bash
$env:PYTHONPATH="backend"
pytest backend/tests
```

#### 3. Frontend Setup
```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Start Vite dev server
npm run dev
```
- **Command Center App:** `http://localhost:5173`

---

### Option B: Docker Compose Setup
```bash
docker compose up --build
```

---

## 🎬 Critical Demo Flow Walkthrough

1. Open Command Center at `http://localhost:5173`.
2. Click **`START DISASTER SIMULATION`** at the top bar.
3. Observe live incoming multi-source reports stream in real time.
4. **Information Fusion:** Watch 3 separate reports near XYZ High School merge into **One Consolidated Incident (`INC-024`)** with 93% match confidence.
5. **Conflict Detection:** Watch contradictory bridge passability reports trigger a **`⚠ CONFLICT DETECTED`** warning banner without suppressing data.
6. **Priority Jump:** Watch priority dynamically shift (**82 → 96**) when an urgent medical report is attached.
7. Click Incident `INC-024`:
   - Inspect the **Explainable AI (XAI)** justification (*"Why is this #1?"*).
   - View the complete Evidence Chain reports.
   - Review auto-calculated required resources (NDRF Rescue Teams, Ambulances, Medical Kits, Water Units).
8. Test Responder Actions: Verify incident, assign responder squad, or mark resolved.
9. Open **Submit Emergency Report**: Upload an image to test instant AI Vision entity extraction.
10. Open **Analytics Tab**: Review Recharts breakdown of disaster types, severity levels, resource demands, and priority score buckets.

---

## 🔐 Environment Variables (`.env`)

```ini
DATABASE_URL=sqlite:///./resqfusion.db
AI_PROVIDER=mock
AI_API_KEY=
HOST=0.0.0.0
PORT=8000
SECRET_KEY=resqfusion-super-secret-key-2026
```

---

## 📄 License
MIT License — ResQFusion AI Disaster Intelligence Platform.
