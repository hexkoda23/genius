import os
import base64
import tempfile
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from app.services.groq_service import ask_groq

router = APIRouter(prefix="/exams", tags=["Exams"])


class ExamQuestionRequest(BaseModel):
    question: str
    exam_type: str = "WAEC"
    subject: str = "Mathematics"
    year: Optional[int] = None
    topic: Optional[str] = None


class IngestPaperRequest(BaseModel):
    pdf_base64: str
    title: str
    exam_type: str   # WAEC | NECO | JAMB | OTHER
    subject: str = "Mathematics"
    year: Optional[int] = None


@router.post("/ask")
async def ask_exam_question(request: ExamQuestionRequest):
    """Answer a past exam question with full working."""
    year_str = f" {request.year}" if request.year else ""
    prompt = f"""A student is practising {request.exam_type}{year_str} {request.subject}.

Question: {request.question}

This is an exam question so:
1. Show the full worked solution step by step
2. State the mark scheme approach (what examiners look for)
3. Show ALL valid methods if more than one exists
4. End with a 'Key Examiner Tips' section
5. Be encouraging — this student is preparing for an important exam"""

    response = ask_groq(prompt)
    return {"success": True, "response": response}


@router.post("/ingest")
async def ingest_exam_paper(request: IngestPaperRequest):
    """Ingest a PDF exam paper into the RAG database."""
    try:
        # Decode base64 PDF
        pdf_bytes = base64.b64decode(request.pdf_base64)

        # Save to books directory so the ingest pipeline picks it up
        books_dir = os.path.join(
            os.path.dirname(__file__), '..', '..', 'books'
        )
        os.makedirs(books_dir, exist_ok=True)

        year_str  = f"_{request.year}" if request.year else ""
        safe_name = request.title.replace(' ', '_').replace('/', '_')
        filename  = f"{request.exam_type}_{safe_name}{year_str}.pdf"
        filepath  = os.path.join(books_dir, filename)

        with open(filepath, 'wb') as f:
            f.write(pdf_bytes)

        # Run ingest pipeline
        from app.rag.ingest import ingest_books
        ingest_books(force_reingest=False)

        return {
            "success":  True,
            "message":  f"Successfully ingested: {filename}",
            "filename": filename,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/papers")
async def list_exam_papers():
    """List all available exam papers."""
    books_dir = os.path.join(
        os.path.dirname(__file__), '..', '..', 'books'
    )
    os.makedirs(books_dir, exist_ok=True)

    papers = []
    for filename in sorted(os.listdir(books_dir)):
        if not filename.lower().endswith('.pdf'):
            continue
        filepath = os.path.join(books_dir, filename)
        size_mb  = os.path.getsize(filepath) / (1024 * 1024)
        name     = os.path.splitext(filename)[0]

        # Parse exam type from filename
        exam_type = 'OTHER'
        for et in ['WAEC', 'NECO', 'JAMB']:
            if et in filename.upper():
                exam_type = et
                break

        papers.append({
            "filename":  filename,
            "name":      name,
            "exam_type": exam_type,
            "size_mb":   round(size_mb, 1),
        })

    return {"success": True, "papers": papers}