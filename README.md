# 📐 MathGenius

> **AI-powered Mathematics Learning Platform for Nigerian Exam Prep**

MathGenius is a full-stack web application that combines symbolic math solving, AI tutoring, Computer-Based Testing (CBT), past-question practice, and progress tracking — all tailored for students preparing for **WAEC, JAMB, NECO, BECE, and NABTEB** examinations.

---

## ✨ Features

### 🧠 AI-Powered Learning
- **AI Solver** — Step-by-step solutions for typed or image-based math problems using Groq LLMs + SymPy
- **AI Tutor (Teach)** — Ask math questions by topic and get structured, curriculum-aligned explanations
- **Topic Wiki** — Auto-generated study notes and overviews for any math topic
- **Floating Chat** — Persistent AI assistant available across the app
- **Practice Grading** — Submit open-ended answers and get AI feedback

### 📝 Exam Practice
- **CBT Mode** — Timed multiple-choice sessions with automatic marking, difficulty classification, and report summaries
- **Past Questions** — WAEC, JAMB, NECO, BECE, and NABTEB past questions with filtering by year, topic, and exam type
- **Theory Practice** — Long-answer theory questions with model-answer comparison
- **Mock Exam** — Full simulated exam experience with timed sessions
- **Daily Challenge** — One fresh question set every day
- **AI Quiz** — Dynamically generated MCQs on any topic
- **Question Bank** — Browse and filter all stored questions

### 🏆 Gamification & Social
- **XP & Streak System** — Earn experience points and build daily streaks
- **Leaderboard** — Compete with other users globally or by school
- **Challenges** — Challenge a friend to a head-to-head question set
- **Battle Mode** — Real-time or async math battles
- **Study Groups** — Collaborative group study sessions
- **Certificates** — Downloadable achievement certificates
- **Share Profile / Results** — Share progress cards to social media

### 📊 Progress & Analytics
- **Dashboard** — Overview of XP, streaks, weak topics, and performance prediction
- **Topic Mastery** — Per-topic mastery percentages with drill-down
- **Weekly Report** — Printable/downloadable weekly performance report cards
- **CBT History** — Full history of past CBT sessions with per-question breakdowns
- **Bookmarks** — Save and revisit specific questions
- **Spaced Repetition Reviews** — Optimal review scheduling for weak questions

### 🛠️ Utilities & Accessibility
- **Study Planner** — AI-generated personalized study schedules
- **Formula Sheet** — Quick-reference sheet of key formulas by topic
- **Notes** — Personal in-app notes with Markdown support
- **Teacher / Parent Dashboard** — Read-only monitoring view for guardians
- **PWA Support** — Installable as a mobile/desktop app with offline caching
- **Push Notifications** — Browser push notifications for reminders and alerts

---

## 🏗️ Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 19, Vite 7, Tailwind CSS 4, React Router 7 |
| **Math Rendering** | KaTeX, react-katex |
| **Backend** | FastAPI, Uvicorn, Pydantic v2 |
| **AI / LLM** | Groq SDK (Llama / Mixtral models) |
| **Symbolic Math** | SymPy |
| **RAG Pipeline** | Qdrant (local vector store), SentenceTransformers, LangChain Text Splitters |
| **PDF Processing** | PyPDF, pdfplumber |
| **Auth & Database** | Supabase (Auth, PostgREST, Storage) |
| **Scraping** | Selenium, BeautifulSoup4, Requests |
| **Image Processing** | Pillow |
| **PWA** | vite-plugin-pwa |
| **HTTP Client** | Axios (frontend), Httpx (backend) |

---

## 📁 Project Structure

```text
Math_Genius/
├── backend/
│   ├── app/
│   │   ├── main.py                  # FastAPI app entry point, CORS, router registration
│   │   ├── dependencies.py          # Shared dependency injection (Supabase client, etc.)
│   │   ├── routers/
│   │   │   ├── solve.py             # Math solving, step explanations, image OCR, practice
│   │   │   ├── teach.py             # AI tutoring, topic overviews, wiki generation
│   │   │   ├── cbt.py               # CBT sessions, MCQ generation, daily challenge
│   │   │   ├── exams.py             # Exam paper ingestion and retrieval
│   │   │   ├── past_questions.py    # Past question fetching and filtering
│   │   │   ├── tracking.py          # User sessions, XP, streaks, stats, weak topics
│   │   │   └── study_plan.py        # AI-generated study plan creation
│   │   ├── services/
│   │   │   ├── groq_service.py      # LLM interaction wrapper (Groq)
│   │   │   ├── math_service.py      # SymPy symbolic computation helpers
│   │   │   ├── latex_cleaner.py     # LaTeX / math expression sanitization
│   │   │   ├── alert_service.py     # In-app alert/notification logic
│   │   │   └── push_service.py      # Web push notification dispatch
│   │   └── rag/
│   │       └── ingest.py            # PDF ingestion → embedding → Qdrant upload
│   ├── books/                       # PDF textbooks for RAG ingestion
│   ├── images/                      # Served static images (question diagrams)
│   ├── qdrant_db/                   # Local Qdrant vector store (auto-created)
│   ├── waec/                        # Scraped WAEC JSON question data
│   ├── neco/                        # Scraped NECO JSON question data
│   ├── jamb/                        # Scraped JAMB JSON question data
│   ├── bece_objective.json          # BECE objective questions (scraped)
│   ├── bece_theory.json             # BECE theory questions (scraped)
│   ├── nabteb_*.json                # NABTEB theory questions by year
│   ├── solution_generator.py        # Standalone solution generation endpoint
│   └── *.py                         # Utility scripts (scraping, upload, cleanup)
│
├── frontend/
│   ├── public/                      # Static assets, PWA manifest, icons
│   ├── src/
│   │   ├── App.jsx                  # Root component, routing definitions
│   │   ├── main.jsx                 # React entry point
│   │   ├── pages/                   # Full page components (35 pages)
│   │   │   ├── Landing.jsx          # Public landing/marketing page
│   │   │   ├── Login.jsx / Onboarding.jsx
│   │   │   ├── Dashboard.jsx        # Main student dashboard
│   │   │   ├── Solve.jsx            # AI math solver interface
│   │   │   ├── Teach.jsx / TopicWiki.jsx / Classroom.jsx
│   │   │   ├── CBT.jsx / CBTHistory.jsx / MockExam.jsx
│   │   │   ├── PastQuestions.jsx / QuestionBank.jsx
│   │   │   ├── Practice.jsx / TheoryPractice.jsx / Review.jsx
│   │   │   ├── AIQuiz.jsx / DailyChallenge.jsx
│   │   │   ├── Battle.jsx / Challenge.jsx / Groups.jsx
│   │   │   ├── Leaderboard.jsx / TopicMastery.jsx
│   │   │   ├── Profile.jsx / ShareProfile.jsx / Certificate.jsx
│   │   │   ├── WeeklyReport.jsx / StudyPlanner.jsx
│   │   │   ├── Notes.jsx / Bookmarks.jsx / FormulaSheet.jsx
│   │   │   └── TeacherParentDashboard.jsx
│   │   ├── components/              # Reusable UI components
│   │   │   ├── layout/              # Navbar, Sidebar
│   │   │   ├── solve/               # Solver sub-components (input, display)
│   │   │   ├── teach/               # Topic sidebar, chat components
│   │   │   ├── FloatChat.jsx        # Global floating AI assistant
│   │   │   ├── SolutionDisplay.jsx  # Formatted math solution renderer
│   │   │   ├── ShareResultCard.jsx  # Shareable result card generator
│   │   │   ├── NotificationBell.jsx # In-app notification UI
│   │   │   ├── InstallBanner.jsx    # PWA install prompt
│   │   │   ├── OfflineBanner.jsx    # Offline status indicator
│   │   │   └── XPToast.jsx          # XP gain animation toast
│   │   ├── lib/                     # Supabase client, XP/stats utilities
│   │   ├── context/                 # React context providers
│   │   ├── hooks/                   # Custom React hooks
│   │   └── sw.js                    # Service worker for PWA caching
│   ├── package.json
│   └── vite.config.js
│
├── requirements.txt                 # Python dependencies
└── README.md
```

---

## ⚙️ Requirements

### System
| Tool | Version |
|---|---|
| Python | 3.11+ |
| Node.js | 20+ |
| npm | 10+ |

### Python Packages
Managed via `requirements.txt` in the project root. Key packages:

| Package | Purpose |
|---|---|
| `fastapi`, `uvicorn` | API server |
| `pydantic` | Request/response validation |
| `sympy` | Symbolic math engine |
| `groq` | LLM API client |
| `qdrant-client` | Local vector database |
| `sentence-transformers` | Text embedding for RAG |
| `pypdf`, `pdfplumber` | PDF text extraction |
| `supabase` | Database & auth client |
| `selenium`, `beautifulsoup4` | Web scraping |
| `Pillow` | Image processing |
| `wordninja` | Word-boundary fixing in scraped text |

### Frontend Packages
Managed via `frontend/package.json`. Key packages:

| Package | Purpose |
|---|---|
| `react`, `react-dom` | UI framework |
| `react-router-dom` | Client-side routing |
| `@supabase/supabase-js` | Supabase auth & DB |
| `axios` | HTTP requests |
| `katex`, `react-katex` | Math formula rendering |
| `lucide-react` | Icon library |
| `vite-plugin-pwa` | PWA generation |
| `tailwindcss` | Utility CSS framework |

---

## 🔐 Environment Variables

### Backend — `backend/.env`
```env
GROQ_API_KEY=your_groq_api_key
APP_NAME=MathGenius
ENVIRONMENT=development
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your_supabase_service_role_key
```

### Frontend — `frontend/.env`
```env
VITE_API_URL=http://127.0.0.1:8000
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

> ⚠️ **Never commit real `.env` files.** Keep `SUPABASE_SERVICE_KEY` backend-only — it bypasses row-level security.

---

## 🚀 Local Setup

### 1. Clone the Repository
```bash
git clone https://github.com/your-username/Math_Genius.git
cd Math_Genius
```

### 2. Backend Setup
```bash
cd backend
python -m venv venv

# Windows
venv\Scripts\activate
# macOS/Linux
source venv/bin/activate

pip install --upgrade pip
pip install -r ../requirements.txt
```

Create `backend/.env` with your credentials (see above).

Start the API server:
```bash
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Verify it's running:
```
GET http://127.0.0.1:8000/
```

### 3. Frontend Setup
```bash
cd frontend
npm install
```

Create `frontend/.env` with your credentials (see above).

Start the dev server:
```bash
npm run dev
```

App opens at: **`http://localhost:5173`**

---

## 🌐 API Reference

### `/solve` — Math Solver
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/solve/` | Solve a math expression symbolically |
| `POST` | `/solve/explain` | Get a step-by-step explanation |
| `POST` | `/solve/image` | Extract and solve from an image (OCR) |
| `POST` | `/solve/practice/question` | Generate a practice question |
| `POST` | `/solve/practice/grade` | Grade a submitted answer |

### `/teach` — AI Tutor
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/teach/ask` | Ask the AI tutor a topic question |
| `POST` | `/teach/overview` | Get a topic overview/study note |
| `GET` | `/teach/topics` | List all available curriculum topics |
| `GET` | `/teach/wiki/{topic}` | Retrieve pre-generated wiki for a topic |

### `/cbt` — Computer-Based Testing
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/cbt/parse` | Parse a question set for CBT session |
| `POST` | `/cbt/explain` | Explain a CBT question answer |
| `POST` | `/cbt/report-summary` | Generate an AI summary of a CBT result |
| `POST` | `/cbt/classify-difficulty` | Tag questions by difficulty level |
| `POST` | `/cbt/verify-answers` | Batch verify answer correctness |
| `GET` | `/cbt/daily-challenge` | Fetch today's daily challenge questions |
| `POST` | `/cbt/generate-mcq` | Generate new MCQs on any topic |

### `/exams` — Exam Papers
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/exams/ask` | Query an exam paper via RAG |
| `POST` | `/exams/ingest` | Ingest a new exam PDF into the vector store |
| `GET` | `/exams/papers` | List all available exam papers |

### `/tracking` — Progress & Analytics
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/tracking/session/start` | Start a study session |
| `POST` | `/tracking/session/end` | End a study session |
| `POST` | `/tracking/attempt` | Log a question attempt |
| `GET` | `/tracking/profile/{user_id}` | Get user profile |
| `PUT` | `/tracking/profile/{user_id}` | Update user profile |
| `GET` | `/tracking/stats/{user_id}` | Get overall statistics |
| `GET` | `/tracking/topics/{user_id}` | Get per-topic performance |
| `GET` | `/tracking/history/{user_id}` | Get session history |
| `POST` | `/tracking/teach-log` | Log a tutoring interaction |
| `POST` | `/tracking/streak/update` | Update daily streak |
| `GET` | `/tracking/weak-topics/{user_id}` | Identify weak topics |

### `/past-questions` — Past Questions
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/past-questions/` | List questions with filters (exam, year, topic) |
| `GET` | `/past-questions/{id}` | Get a specific question |

### `/study-plan` — Study Planner
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/study-plan/generate` | Generate a personalized study plan |

### `/api/solution` — Standalone Solution
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/solution` | Alternative solution generator endpoint |

---

## 📚 RAG Pipeline (Textbook-Grounded Answers)

To enable textbook-based context in AI answers:

1. Add PDF textbooks to `backend/books/`
2. Run the ingest script:
   ```bash
   cd backend
   python -m app.rag.ingest
   ```
3. The vector store is built under `backend/qdrant_db/` and used automatically on subsequent API calls.

---

## 🛠️ Data Pipeline Scripts

The `backend/` directory contains utility scripts for question data management:

| Script | Purpose |
|---|---|
| `scraper.py` | Scrape WAEC objective questions |
| `scraper_theory.py` | Scrape WAEC theory questions |
| `scraper_bece.py` | Scrape BECE questions (1990–2012) |
| `scraper_nabteb.py` | Scrape NABTEB theory questions |
| `scrape_all.py` | Orchestrate full scrape across all exams |
| `upload_questions.py` | Upload objective questions to Supabase |
| `upload_theory.py` | Upload theory questions to Supabase |
| `upload_bece.py` | Upload BECE questions to Supabase |
| `upload_nabteb.py` | Upload NABTEB questions to Supabase |
| `fast_upload_bece.py` | Faster parallel BECE upload |
| `verify_answers.py` | Verify answer correctness in DB |
| `verify_bece.py` | Verify BECE upload integrity |
| `fix_missing_options.py` | Patch questions missing answer options |
| `fix_word_spacing.py` | Fix word-boundary errors in scraped text |
| `fix_image_paths.py` | Normalise image paths after upload |
| `classify_questions.py` | Classify questions by topic using AI |
| `clean_images.py` | Remove orphaned/unused images |
| `check_quality.py` | Run quality checks on question data |

---

## 🗄️ Database (Supabase)

The app uses Supabase (PostgreSQL + auth) with approximately the following table structure:

| Table | Purpose |
|---|---|
| `profiles` | Extended user profile (XP, streak, onboarding data) |
| `exam_questions` | Objective MCQ questions (WAEC, JAMB, NECO, BECE, NABTEB) |
| `theory_questions` | Long-answer theory questions |
| `user_attempts` | Individual question attempt records |
| `study_sessions` | Session start/end logs |
| `bookmarks` | Saved/bookmarked questions |
| `teach_logs` | AI tutoring interaction history |

Row-Level Security (RLS) is enforced — users can only access their own data. The Supabase service key is **never** exposed to the frontend.

---

## 🔧 Development Notes

- **CORS** is configured to allow `http://localhost:5173` and `http://localhost:3000`
- Static question images are served from `backend/images/` at `/images/{filename}`
- Frontend falls back to `http://localhost:8000` if `VITE_API_URL` is not set
- The PWA service worker (`src/sw.js`) caches core assets for offline use
- KaTeX is used for all math rendering; LaTeX strings are sanitized on the backend before being sent to the frontend

---

## 🐛 Troubleshooting

| Problem | Solution |
|---|---|
| `ModuleNotFoundError` | Confirm backend venv is activated and `pip install -r ../requirements.txt` ran successfully |
| Frontend can't reach API | Check `VITE_API_URL` in `frontend/.env` and confirm backend is running on port `8000` |
| Groq API errors | Check `GROQ_API_KEY` is valid in `backend/.env` |
| Supabase 401 / 403 | Verify URL/key pair; ensure the service key is only in the backend |
| No RAG context returned | Run `python -m app.rag.ingest` and confirm `backend/qdrant_db/` contains data |
| Selenium scraper fails | Ensure ChromeDriver is compatible with your installed Chrome version (`webdriver-manager` handles this automatically) |
| Images not loading | Check `backend/images/` path and that the FastAPI static mount is active |

---

## 📜 License

No license file is currently present in this repository. If you plan to distribute this project publicly, add an appropriate license (e.g., MIT, Apache 2.0).
