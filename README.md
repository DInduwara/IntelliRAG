#  IntelliRAG: Multi-Agent Enterprise RAG Platform

[![Next.js](https://img.shields.io/badge/Next.js-14-black?logo=next.js)](https://nextjs.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.110+-009688?logo=fastapi)](https://fastapi.tiangolo.com/)
[![LangGraph](https://img.shields.io/badge/LangGraph-Multi--Agent-blue?logo=langchain)](https://langchain.com/)
[![Pinecone](https://img.shields.io/badge/Pinecone-Vector_DB-black?logo=pinecone)](https://pinecone.io/)
[![Neon](https://img.shields.io/badge/Neon-Serverless_Postgres-00e599?logo=postgresql)](https://neon.tech/)

> **Live Demo:** [https://intelli-rag.vercel.app/](https://intelli-rag.vercel.app/)

IntelliRAG is a production-grade Retrieval-Augmented Generation (RAG) platform that moves beyond "naive RAG" by orchestrating a **5-node Directed Acyclic Graph (DAG)** of specialized AI agents. It features secure multi-tenancy, persistent conversational memory, and a strict zero-hallucination protocol.

---

##  Enterprise Features

*  **Multi-Agent Orchestration (LangGraph):** Instead of a single LLM call, user queries are processed by a network of agents (Search Strategist, Context Critic, Answer Writer, and Compliance Auditor).
*  **Zero-Hallucination Protocol:** A dedicated "Context Critic" actively grades and filters retrieved vector chunks. If the data is irrelevant, it gets discarded. A final "Auditor" agent ensures all claims have verifiable deterministic citations.
* **Secure Multi-Tenancy:** Complete data isolation via Clerk authentication, Pinecone metadata filtering, and relational mapping in Neon PostgreSQL. Users can only query their own isolated documents.
* **Persistent Chat Memory:** Stateful conversational threads are securely checkpointed using LangGraph's `PostgresSaver` and a serverless PostgreSQL connection pool.
* **High-Fidelity Ingestion:** Robust document parsing utilizing `PyMuPDF` to handle complex layouts, tables, and bounding boxes without crashing.
* **Radical UI Transparency:** A custom glassmorphic Next.js dashboard exposes the AI’s "thought process" (Agentic Plan) and raw search logs (Retrieval Inspector) to build user trust.

---

##  Architecture & Tech Stack

IntelliRAG treats AI as a stateful data pipeline rather than a stateless API wrapper. It uses a hybrid database approach: **Pinecone** for semantic vector similarity, and **Neon (PostgreSQL)** for transactional metadata and chat history.

### Frontend
* **Framework:** Next.js 14 (App Router), React, TypeScript
* **Styling:** Tailwind CSS, Framer Motion (Glassmorphic UI)
* **Auth:** Clerk

### Backend
* **Framework:** FastAPI, Python 3.12, Uvicorn
* **AI Orchestration:** LangChain, LangGraph
* **LLM & Embeddings:** OpenAI (`gpt-4o-mini`, `text-embedding-3-small`)
* **Databases:** Pinecone (Vector), Neon (Relational)
* **Ingestion Engine:** PyMuPDF

---

##  Getting Started (Local Development)

### 1. Prerequisites
* Python 3.11+
* Node.js 18+
* API Keys for: OpenAI, Pinecone, Neon (Postgres), and Clerk.

### 2. Clone the Repository
```
git clone [https://github.com/DInduwara/IntelliRAG.git](https://github.com/DInduwara/IntelliRAG.git)
cd IntelliRAG
```

### 3. Backend Setup (FastAPI)
Navigate to the backend directory and set up your virtual environment:
```
cd backend
python -m venv venv
source venv/bin/activate  # On Windows use `venv\Scripts\activate`
pip install -r requirements.txt
```
Create a ```.env``` file in the backend directory:
```
OPENAI_API_KEY=your_openai_api_key
PINECONE_API_KEY=your_pinecone_api_key
PINECONE_INDEX_NAME=your_index_name
DATABASE_URL=your_neon_postgres_connection_string
CLERK_ISSUER_URL=your_clerk_issuer_url
FRONTEND_ORIGIN=http://localhost:3000
```
Start the backend server:
```
uvicorn src.app.api:app --reload --port 8000
````

### Frontend Setup (Next.js)
Open a new terminal, navigate to the frontend directory:
```
cd frontend
npm install
```
Create a ```.env.local``` file in the frontend directory:
```
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_pub_key
CLERK_SECRET_KEY=your_clerk_secret_key
NEXT_PUBLIC_API_URL=http://localhost:8000
```
Start the development server:
```
npm run dev
```
The app will be running at ```http://localhost:3000```.

---

## Screenshots

<img width="1919" height="864" alt="Screenshot 2026-03-10 180817" src="https://github.com/user-attachments/assets/2d50e64c-4e61-47ad-88b8-4fb412d7ba6c" />

<img width="1913" height="861" alt="Screenshot 2026-03-10 180939" src="https://github.com/user-attachments/assets/9d1ca0a7-66b1-44c3-865f-5778a9096535" />

---

## Author

**Dinuka Induwara Bandara**  
Software Engineering Intern · AI Developer  
[LinkedIn](https://www.linkedin.com/in/dinuka-induwara) | [Portfolio](https://dinuka-induwara-portfolio.vercel.app)

---

## License
This project is licensed under the MIT License.
