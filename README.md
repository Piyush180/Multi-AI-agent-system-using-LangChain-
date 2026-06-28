# 🤖 Multi-Agent AI Research System

A full-stack AI research system powered by **LangChain + Google Gemini 2.0 Flash**, with a **React** frontend and **FastAPI** backend. Four specialized agents collaborate to deliver comprehensive research reports.

## 🏗️ Architecture

```
research-pipeline/
├── backend/           # Python + FastAPI
│   ├── agents.py      # LangChain agents (Gemini-powered, uses create_agent)
│   ├── tools.py       # Tavily search + BeautifulSoup scraper
│   ├── pipeline.py    # 4-stage pipeline (sync + SSE streaming)
│   ├── server.py      # FastAPI REST + SSE bridge
│   ├── requirements.txt
│   └── .env.example
└── frontend/          # React + Vite
    ├── src/
    │   ├── App.jsx    # Main component (wired to backend SSE)
    │   └── index.css  # Dark glassmorphism design system
    ├── package.json
    └── vite.config.js # Proxies /api → localhost:8000
```

## 🔄 4-Stage Research Pipeline

| Stage | Agent | What it does |
|-------|-------|-------------|
| 1️⃣ | **Search Agent** | Uses Tavily to find top 5 web results |
| 2️⃣ | **Reader Agent** | Scrapes & summarises pages via BeautifulSoup |
| 3️⃣ | **Writer Chain** | Composes a structured markdown report |
| 4️⃣ | **Critic Chain** | Reviews, fact-checks & improves the report |

---

## 🚀 Quick Start

### Step 1 — Get Your FREE API Keys

#### 🔑 Google Gemini API Key (FREE, no credit card)
1. Go to **https://aistudio.google.com/app/apikey**
2. Sign in with your Google account
3. Click **"Create API Key"**
4. Copy the key — you get **1 million tokens/day FREE**

#### 🔑 Tavily Search API Key (FREE tier)
1. Go to **https://app.tavily.com**
2. Sign up for a free account
3. Copy your API key — **1,000 free searches/month**

---

### Step 2 — Set Up the Backend

```bash
cd research-pipeline/backend

# Copy the env template
copy .env.example .env        # Windows
# cp .env.example .env        # Mac/Linux

# Edit .env and paste your keys:
# GOOGLE_API_KEY=AIza...
# TAVILY_API_KEY=tvly-...

# Create a virtual environment
python -m venv venv
venv\Scripts\activate          # Windows
# source venv/bin/activate    # Mac/Linux

# Install dependencies
pip install -r requirements.txt

# Start the API server
uvicorn server:app --reload
```

The backend will be live at **http://localhost:8000**
- API docs: http://localhost:8000/docs
- Health check: http://localhost:8000/api/health

---

### Step 3 — Set Up the Frontend

```bash
cd research-pipeline/frontend

# Install dependencies
npm install

# Start the dev server
npm run dev
```

Open **http://localhost:5173** in your browser 🎉

---

## 🐳 Docker (One-Command Setup)

```bash
# Set your API keys in docker-compose.yml first, then:
docker-compose up --build
```

---

## 📡 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/health` | Health check |
| `POST` | `/api/research` | Run full pipeline, return JSON |
| `GET` | `/api/stream?topic=...` | SSE streaming (stage-by-stage) |

### Example: POST /api/research
```bash
curl -X POST http://localhost:8000/api/research \
  -H "Content-Type: application/json" \
  -d '{"topic": "Quantum computing breakthroughs 2025"}'
```

---

## 🆓 Gemini Free Tier Details

| Limit | Value |
|-------|-------|
| Model | `gemini-2.0-flash` |
| Requests per minute | 15 RPM |
| Tokens per day | 1,000,000 |
| Credit card required | ❌ No |
| Setup time | ~2 minutes |

---

## 🛠️ Tech Stack

- **AI**: Google Gemini 2.0 Flash via `langchain-google-genai`
- **Agents**: LangChain `create_tool_calling_agent` + `AgentExecutor` (not ReAct)
- **Search**: Tavily Python SDK
- **Scraping**: BeautifulSoup4 + lxml
- **Backend**: FastAPI + Uvicorn
- **Streaming**: Server-Sent Events (SSE)
- **Frontend**: React 18 + Vite
- **Styling**: Vanilla CSS with glassmorphism dark theme
