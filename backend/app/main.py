import os
from dotenv import load_dotenv

# Load environment variables before importing any other app modules
load_dotenv()

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from app.routers import solve, teach
from app.routers.exams import router as exams_router
from app.routers.cbt import router as cbt_router
from app.routers.tracking import router as tracking_router
from app.routers.past_questions import router as past_questions_router
from app.routers.study_plan import router as study_plan_router
from solution_generator import router as solution_router

# ── Rate limiter (shared across all routers) ──────────────────────────
limiter = Limiter(key_func=get_remote_address)

# ── Hide docs in production ───────────────────────────────────────────
IS_PROD = os.environ.get("ENV") == "production"

app = FastAPI(
    title="MathGenius API",
    description="AI-powered mathematics learning platform",
    version="1.0.0",
    docs_url=None if IS_PROD else "/docs",
    redoc_url=None if IS_PROD else "/redoc",
    openapi_url=None if IS_PROD else "/openapi.json",
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

allowed_origins_raw = os.environ.get(
    "ALLOWED_ORIGINS",
    ",".join([
        "http://localhost:5173",
        "http://localhost:3000",
        "https://genius-eight-phi.vercel.app",
        "https://genius-jsvm.onrender.com",
    ]),
)
ALLOWED_ORIGINS = [
    origin.strip().strip("'\"`")
    for origin in allowed_origins_raw.split(",")
    if origin.strip().strip("'\"`")
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)

# ── Global error handler — hides internal errors from users ──────────
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    print(f"[ERROR] {request.method} {request.url} → {exc}")
    return JSONResponse(
        status_code=500,
        content={"error": "Something went wrong. Please try again."}
    )

# ── Routers ───────────────────────────────────────────────────────────
app.include_router(solve.router)
app.include_router(teach.router)
app.include_router(exams_router)
app.include_router(cbt_router)
app.include_router(tracking_router)
app.include_router(past_questions_router)
app.include_router(solution_router)
app.include_router(study_plan_router)
 
# Mount images from the backend root directory
images_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "images")
if os.path.isdir(images_dir):
    app.mount("/images", StaticFiles(directory=images_dir), name="images")
else:
    # Fallback for local dev if script is run from different cwd
    alt_images_dir = os.path.abspath("images")
    if os.path.isdir(alt_images_dir):
        app.mount("/images", StaticFiles(directory=alt_images_dir), name="images")

@app.get("/")
async def root():
    return {
        "message": "MathGenius API is running!",
        "version": "1.0.0",
        "modules": ["solve", "teach", "cbt", "exams", "tracking", "past_questions"]
    }
