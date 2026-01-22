# IntelliRAG

**Intelligent Retrieval-Augmented Generation System**
A production-ready **FastAPI-based RAG platform** that allows users to upload PDFs, automatically index them into a vector database, and query the content using large language models with semantic retrieval.



# Overview
InteliRAG is an AI-powered document intelligence system designed to:
- Upload and process PDF documents
- Chunk and embed document content
- Store embeddings in a vector database (Pinecone)
- Retrieve relevant context using semantic search
- Generate accurate, context-aware answers using LLMs
The system is built with **scalability, modularity, and production deployment** in mind.



# Key Features
- PDF Upload & Parsing
- Configurable Chunking with Overlap
- Vector Embedding & Semantic Search
- Context-aware Question Answering
- Indexing Status & Chunk Tracking
- REST API with FastAPI
- Cloud Deployment on Azure App Service
- Environment-based Configuration
- Modular Service Architecture



# Architecture Overview
```
                   +------------------------+
                   |      Frontend (UI)     |
                   |  Next.js + React + API |
                   +-----------+------------+
                               |
                     API calls  |
                               v
                   +------------------------+
                   |     FastAPI Backend     |
                   | Index | Retrieval | QA |
                   +-----------+------------+
                               |
                   Embeddings | Vectors
                               v
                         +-------------+
                         | Pinecone DB |
                         +-------------+
                               |
                               v
                         LLM (OpenAI)

```



# Technology Stack
**Backend**
- Python 3.11
- FastAPI
- Gunicorn + Uvicorn Worker

**Frontend**
- Next.js
- TypeScript
- TailwindCSS

**AI / RAG**
- LangChain
- LangChain Community
- LangGraph
- OpenAI API
- Pinecone Vector DB

**Document Processing**
- PyPDF
- python-multipart

**Deployment**
- Azure App Service (Linux)
- GitHub Actions CI/CD
- Vercel



# Project Structure 
```
IntelliRAG/
├── .github/
│   └── workflows/
│       └── main_intellirag.yml        # CI/CD pipeline (GitHub Actions → Azure App Service)
│
├── backend/
│   ├── src/
│   │   └── app/
│   │       ├── core/
│   │       │   ├── agents/             # Multi-agent RAG logic (LangGraph)
│   │       │   │   ├── agents.py
│   │       │   │   ├── graph.py
│   │       │   │   ├── prompts.py
│   │       │   │   ├── state.py
│   │       │   │   └── tools.py
│   │       │   ├── llm/                # LLM factory & provider abstraction
│   │       │   │   └── factory.py
│   │       │   ├── retrieval/          # Vector search & retrieval logic
│   │       │   │   └── config.py
│   │       │   └── __init__.py
│   │       │
│   │       ├── services/
│   │       │   ├── indexing_service.py # PDF ingestion & embedding pipeline
│   │       │   ├── qa_service.py       # Question-answering pipeline
│   │       │   └── __init__.py
│   │       │
│   │       ├── api.py                  # FastAPI entrypoint (REST endpoints)
│   │       ├── models.py               # Pydantic request/response models
│   │       └── __init__.py
│   │
│   ├── data/                           # Local data / test artifacts
│   ├── requirements.txt                # Python dependencies
│   ├── pyproject.toml                  # Python project metadata
│   ├── uv.lock                         # Dependency lock file
│   └── .python-version                 # Python runtime version
│
├── frontend/
│   ├── public/
│   │   └── icon.ico
│   │
│   ├── src/
│   │   ├── app/
│   │   │   ├── upload/
│   │   │   │   └── page.tsx            # PDF upload page
│   │   │   ├── layout.tsx              # Global layout
│   │   │   ├── page.tsx                # Main chat UI
│   │   │   └── globals.css
│   │   │
│   │   ├── components/
│   │   │   ├── AppShell.tsx
│   │   │   ├── Button.tsx
│   │   │   ├── Card.tsx
│   │   │   ├── CitationTag.tsx
│   │   │   ├── CitationTooltip.tsx
│   │   │   ├── FileDropzone.tsx
│   │   │   ├── Footer.tsx
│   │   │   ├── Input.tsx
│   │   │   └── Spinner.tsx
│   │   │
│   │   ├── lib/
│   │   │   ├── api.ts                  # Backend API client
│   │   │   ├── citations.ts            # Citation parsing utilities
│   │   │   ├── env.ts                  # Environment config
│   │   │   └── types.ts                # Shared TypeScript types
│   │
│   ├── next.config.ts
│   ├── tailwind.config.ts
│   ├── tsconfig.json
│   ├── eslint.config.mjs
│   ├── postcss.config.mjs
│   ├── package.json
│   └── package-lock.json
│
├── README.md                           # Project documentation
└── .gitignore

```



#  Local Setup
**Clone the repo**
```
git clone https://github.com/DInduwara/InteliRAG.git
cd InteliRAG
```

**Backend**
1. Create and active Python venv
```
cd backend
python3 -m venv venv
source ./venv/bin/activate
```
2. Install dependencies:
```
pip install -r requirements.txt
```
3. Add ``` .env``` with your secrets:
```
OPENAI_API_KEY=
PINECONE_API_KEY=
PINECONE_ENV=
PINECONE_INDEX=
FRONTEND_ORIGIN=
```
4. Run dev server:
```
uvicorn src.app.api:app --reload --host 0.0.0.0 --port 8000
```

**Frontend**
1. Navigate and install:
```
cd frontend
npm install
```

2. Create .env.local with:
```
NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:8000
```

3. Run:
```
npm run dev
```



# Configuration
Environment variables must be set for both local and production

| Variable | Description |
| -------- | -------- |
| OPENAI_API_KEY  | OpenAI API key  |
| PINECONE_API_KEY   | PINECONE_API_KEY   |
| PINECONE_ENV   | Pinecone environment   |
| PINECONE_INDEX  | Index name in Pinecone   |
| FRONTEND_ORIGIN   | Allowed CORS origin   |
| NEXT_PUBLIC_API_BASE_URL   | Frontend base API URL  |



# Document Processing Pipeline
1. Upload PDF
2. Extract Text from PDF
3. Split into Chunks
4. Generate Embeddings
5. Store in Pinecone (Document Processing Pipeline)
6. Ready for semantic querying




#  Deployment


**Azure App Service (Backend)**

1. Create an App Service (Linux, Python 3.11).
2. Add Application Settings:
> - ```SCM_DO_BUILD_DURING_DEPLOYMENT = true```
> - Set OpenAI + Pinecone vars (no quotes)
> - ```WEBSITES_PORT = 8000```

3.Startup command:
```
gunicorn --chdir /home/site/wwwroot src.app.api:app \
  -k uvicorn.workers.UvicornWorker \
  --bind 0.0.0.0:${PORT:-8000} \
  --workers 1 \
  --timeout 300 \
  --graceful-timeout 300
```
4. Push to main → Azure deploys via GitHub Actions.

**Vercel (Frontend)**

1. Create project on Vercel.
2. Add env var:  
```
NEXT_PUBLIC_API_BASE_URL=https://<your-azure-backend>.azurewebsites.net
```
3. Deploy.




# Testing & Validation
The following screenshots demonstrate IntelliRAG’s validation mechanisms,
retrieval accuracy, citation transparency, and hallucination prevention.

**1. PDF Only Upload Validation**

The system enforces strict PDF-only uploads. Non-PDF files are automatically rejected at the UI level, ensuring only supported document formats enter the indexing pipeline.
<img width="1902" height="865" alt="Screenshot 2026-01-22 120458" src="https://github.com/user-attachments/assets/c35f8724-05e3-4515-b7fe-c6e9f1c22a8d" />


**2️. Question Answering with Confidence Indicator**

After indexing, users can ask questions from the uploaded PDF(s). The system generates evidence-grounded answers and displays a confidence level (e.g., High / Low) based on citation coverage and retrieval quality.
<img width="1911" height="857" alt="Screenshot 2026-01-22 121352" src="https://github.com/user-attachments/assets/a19d38a5-0b8b-45ad-be9e-acb99adf159b" />


**3️. Chunk-Level Citations & Evidence View**

Generated answers include clickable, chunk-level citations. Each citation links directly to the exact document segment used, providing transparency and explainable AI behavior.
<img width="1900" height="866" alt="Screenshot 2026-01-22 121406" src="https://github.com/user-attachments/assets/9d755d0c-3f6b-446d-9964-e1644149400b" />


**4️. Raw Context Inspection (Debug View)**

For evaluation and debugging, the system exposes the raw retrieved context used by the agents, allowing inspection of chunk selection and retrieval accuracy.
<img width="1869" height="865" alt="Screenshot 2026-01-22 121420" src="https://github.com/user-attachments/assets/fbdbd088-aed6-4550-abb8-56b8f4d6c623" />


**5️. Irrelevant Question Handling (Hallucination Prevention)**

When a question cannot be answered using the indexed document, the system explicitly states that the information is insufficient, preventing hallucinations and unsupported responses.
<img width="1903" height="837" alt="Screenshot 2026-01-22 121509" src="https://github.com/user-attachments/assets/ed8025b2-767d-4c21-97fb-35e8edabb1a3" />



# Troubleshooting
**Common Issues**

| Issue | Cause | Fix |
| -------- | -------- | -------- |
| ```ModuleNotFoundError```  | Missing dependency  | Add to ```requirments.txt```  |
| Worker timeout   | Heavy startup   | Reduce workers / upgrade plan  |
| SIGKILL   | Memory limit   | Use Basic or higher tier  |
| CORS error  | Frontend origin missing   | Update ```CORS_ORIGINS``` |



### Further Development
- **Query Planning & Decomposition Agent** – Break complex questions into focused sub-queries
- **Multi-Call Retrieval with Structured Tracing** – Preserve all retrieval calls and metadata
- **Context Critic & Re-Ranking Agent** – Filter and prioritize relevant chunks
- **Conversational Multi-Turn QA with Memory** – Enable follow-up questions with session memory

These enhancements build directly on the existing multi-agent LangGraph pipeline and can be incrementally integrated without major architectural changes.



# License
This repository is provided for educational and demonstration use.
Licensed under MIT
