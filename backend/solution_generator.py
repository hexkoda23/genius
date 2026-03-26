"""
solution_generator.py
─────────────────────
POST /api/solution  →  { solution_text, visual: { type, content } }
"""

import os
import base64
import json
import re
from pathlib import Path
from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional
from groq import Groq

router = APIRouter()
client = Groq(api_key=os.environ.get("GROQ_API_KEY"))

IMAGES_BASE_DIR = "images"


# ── Models ────────────────────────────────────────────────────────────

class SolutionRequest(BaseModel):
    question:        str
    question_images: list[str] = []
    marking_scheme:  Optional[str] = None
    answer_images:   list[str] = []
    exam_type:       str = "waec"
    year:            str = ""


class Visual(BaseModel):
    type:    Optional[str]
    content: Optional[str]


class SolutionResponse(BaseModel):
    solution_text: str
    visual:        Visual


# ── Helpers ───────────────────────────────────────────────────────────

def _fallback(msg: str = "Solution temporarily unavailable. Please try Regenerate.") -> SolutionResponse:
    return SolutionResponse(solution_text=msg, visual=Visual(type=None, content=None))


def load_image_base64(rel_path: str) -> Optional[str]:
    try:
        path = Path(rel_path)
        if not path.exists():
            return None
        with open(path, "rb") as f:
            return base64.b64encode(f.read()).decode("utf-8")
    except Exception:
        return None


def get_image_media_type(path: str) -> str:
    ext = path.lower().split(".")[-1]
    return {"jpg": "image/jpeg", "jpeg": "image/jpeg",
            "png": "image/png",  "gif": "image/gif",
            "webp": "image/webp"}.get(ext, "image/png")


def needs_visual(question: str, scheme: str) -> dict:
    combined = (question + " " + (scheme or "")).lower()
    if any(kw in combined for kw in [
        "bar chart", "histogram", "frequency polygon", "ogive",
        "cumulative frequency", "pie chart", "draw a graph",
        "draw the graph", "plot", "table of values", "frequency table",
        "distribution", "class interval", "class boundaries"
    ]):
        return {"needs": True, "hint": "chart/graph"}
    if any(kw in combined for kw in [
        "table", "tabulate", "frequency distribution", "tally",
        "complete the table", "copy and complete"
    ]):
        return {"needs": True, "hint": "table"}
    if any(kw in combined for kw in [
        "diagram", "bearing", "triangle", "circle", "angle",
        "construct", "locus", "trapezium", "parallelogram",
        "quadrilateral", "rhombus", "sector", "arc"
    ]):
        return {"needs": True, "hint": "geometry diagram"}
    return {"needs": False, "hint": None}


def parse_response(raw: str) -> SolutionResponse:
    """Parse Groq's raw text into a SolutionResponse. Never raises."""
    try:
        # Strip markdown fences
        raw = re.sub(r'```json\s*', '', raw)
        raw = re.sub(r'```\s*',     '', raw)
        raw = raw.strip()

        # Extract first JSON object
        json_match = re.search(r'\{[\s\S]*\}', raw)
        if json_match:
            raw = json_match.group(0)

        parsed = json.loads(raw)
        solution_text = parsed.get("solution_text", "No solution generated.")
        visual_data   = parsed.get("visual") or {}

        return SolutionResponse(
            solution_text=solution_text,
            visual=Visual(
                type=visual_data.get("type"),
                content=visual_data.get("content"),
            )
        )

    except json.JSONDecodeError:
        # Try extracting solution_text manually
        text_match = re.search(r'"solution_text"\s*:\s*"([\s\S]*?)",\s*"visual"', raw)
        if text_match:
            return SolutionResponse(
                solution_text=text_match.group(1).replace('\\"', '"'),
                visual=Visual(type=None, content=None)
            )
        # Last resort: return the raw text stripped of JSON punctuation
        clean = re.sub(r'"visual"\s*:[\s\S]*$', '', raw)
        clean = re.sub(r'^\s*\{\s*"solution_text"\s*:\s*"?', '', clean).strip().rstrip('",}')
        return SolutionResponse(
            solution_text=clean or raw,
            visual=Visual(type=None, content=None)
        )

    except Exception:
        return _fallback()


# ── System prompt ─────────────────────────────────────────────────────

SYSTEM_PROMPT = """You are an expert Nigerian mathematics teacher solving WAEC/NECO/BECE theory questions.

Your response MUST be valid JSON with exactly this structure:
{
  "solution_text": "Full step-by-step solution here. Use plain text math notation.",
  "visual": {
    "type": null,
    "content": null
  }
}

Rules for the "visual" field:
- TABLE (frequency table, data table, truth table):
  type="table", content=HTML table string with inline styles
- GRAPH/CHART (bar chart, histogram, frequency polygon, pie chart, ogive):
  type="chartjs", content=JSON string of a complete Chart.js config object
- GEOMETRY DIAGRAM (triangle, circle, bearing, angle diagram):
  type="svg", content=SVG string (viewBox="0 0 400 400", include labels)
- No visual needed:
  type=null, content=null

For HTML tables: use border="1" cellpadding="8" style="border-collapse:collapse"
For SVG: minimum 14px font, show all measurements and angles
For Chart.js: always include labels, datasets, options.plugins.title

IMPORTANT: Return ONLY the JSON object. No markdown, no backticks, no preamble.
CRITICAL: Never put HTML, JSON, or markup inside solution_text — visuals go ONLY in visual.content."""


# ── Endpoint ──────────────────────────────────────────────────────────

@router.post("/api/solution", response_model=SolutionResponse)
async def generate_solution(req: SolutionRequest):
    try:
        # Load images
        image_b64_list = []
        for img_path in req.question_images + req.answer_images:
            b64 = load_image_base64(img_path)
            if b64:
                image_b64_list.append({
                    "path":       img_path,
                    "b64":        b64,
                    "media_type": get_image_media_type(img_path),
                })

        # Build prompt
        visual_info = needs_visual(req.question, req.marking_scheme or "")
        user_text   = f"Question: {req.question}\n\n"

        if req.marking_scheme:
            user_text += f"Marking scheme / working:\n{req.marking_scheme}\n\n"

        if visual_info["needs"]:
            user_text += f"IMPORTANT: This solution requires a {visual_info['hint']}. Generate it.\n\n"
        else:
            user_text += "No visual needed.\n\n"

        user_text += "Solve this completely with full working steps."

        # Choose model
        if image_b64_list:
            message_content = [
                {"type": "image_url", "image_url": {"url": f"data:{img['media_type']};base64,{img['b64']}"}}
                for img in image_b64_list
            ] + [{"type": "text", "text": user_text}]
            model = "meta-llama/llama-4-scout-17b-16e-instruct"
        else:
            message_content = user_text
            model = "llama-3.1-8b-instant"

        # Call Groq
        response = client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user",   "content": message_content},
            ],
            temperature=0.3,
            max_tokens=1500,
        )

        raw = response.choices[0].message.content.strip()
        return parse_response(raw)   # ← always returns a valid SolutionResponse

    except Exception as e:
        return _fallback(f"Error: {str(e)}")