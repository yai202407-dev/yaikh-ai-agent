# Yaikh AI Agent

Production-ready AI Agent for the Yaikh ecosystem — powered by **LangChain + Gemini**, deployed on **Google Cloud Run**.

## Features

- 🧠 LangChain agent with Gemini 2.5 Flash
- 💬 Streaming chatbot UI (built-in)
- 📦 MongoDB tools (Purchase Requests, Tickets, Gatepass, Car Booking, Shop)
- 🌐 Web search (DuckDuckGo + Wikipedia)
- 📊 Report generation (Excel/PDF)
- ☁️ Cloud Run ready (Docker + GitHub Actions CI/CD)

## Quick Start (Local)

```bash
cp .env.example .env   # fill in your API keys
npm install
npm run dev            # → http://localhost:8001
```

## Deploy to Cloud Run

Push to `main` — GitHub Actions handles the rest automatically.

See `ARCHITECTURE.md` for full documentation.
