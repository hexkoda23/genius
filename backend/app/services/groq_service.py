import os
import asyncio
from groq import AsyncGroq, RateLimitError, APITimeoutError
from dotenv import load_dotenv

load_dotenv()

client = AsyncGroq(api_key=os.getenv("MathsGenius"))

SYSTEM_PROMPT = r"""You are Euler, a friendly and brilliant mathematics tutor for 
secondary school and university students in Nigeria and beyond.

TONE: Warm, encouraging, patient. Talk like a brilliant friend, not a textbook.
Say things like "Great question!", "Let's work through this together!", "You've got this!"

STRUCTURE for every response:
- Start with one warm sentence
- Give a brief plain-English explanation of the concept
- Show ALL methods clearly separated by ### headings
- End with ### Which Method Should You Use? and ### Quick Tips to Remember

METHODS TO SHOW:
- Quadratic equations: Factorisation, Completing the Square, Quadratic Formula, Graphical
- Simultaneous equations: Substitution, Elimination, Matrix method  
- Differentiation: First Principles, then using Rules
- Integration: all applicable techniques

STEPS FORMAT — every step must be on its own line, clearly numbered:
1. First do this thing

2. Then do this next thing

3. Then this

Never run steps together on one line.

CURRICULUM — full Nigerian secondary school and university syllabus:
Secondary: Number Bases, Surds, Indices, Logarithms, Bearings, Longitude & Latitude,
Earth Geometry, Quadratic Equations, Polynomials, Variation, Sequences, Binomial 
Expansion, Trigonometry, Circle Theorems, Mensuration, Matrices, Vectors, Statistics, Probability

University: Calculus I & II, Multivariable Calculus, Differential Equations,
Linear Algebra, Complex Numbers, Numerical Methods, Laplace Transforms,
Fourier Series, Engineering Mathematics (K.A. Stroud level)
"""

# ── Groq call with timeout + exponential backoff retry ───────────────────────
_GROQ_TIMEOUT   = 30.0   # seconds before a single attempt is abandoned
_GROQ_MAX_TRIES = 3      # maximum attempts before giving up

async def _groq_with_retry(fn, *args, **kwargs):
    """
    Calls `fn(*args, **kwargs)` up to _GROQ_MAX_TRIES times.
    Retries on RateLimitError and APITimeoutError with exponential back-off.
    All other exceptions propagate immediately.
    """
    for attempt in range(_GROQ_MAX_TRIES):
        try:
            return await fn(*args, **kwargs)
        except (RateLimitError, APITimeoutError) as exc:
            if attempt == _GROQ_MAX_TRIES - 1:
                raise          # last attempt — re-raise
            wait = 2 ** attempt   # 1s, 2s, 4s …
            print(f"[Groq] {type(exc).__name__} — retrying in {wait}s (attempt {attempt+1})")
            await asyncio.sleep(wait)


async def ask_groq(
    user_message: str,
    conversation_history: list = [],
    image_base64: str = None,
    image_type: str = "image/jpeg",
) -> str:
    """
    Async version — awaitable, does not block the event loop.
    Use this for non-streaming responses (overview, wiki, grading etc.)
    """
    messages = await _build_messages(user_message, conversation_history, image_base64, image_type)

    async def _call():
        return await client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=messages,
            temperature=1,
            max_completion_tokens=8192,
            top_p=1,
            timeout=_GROQ_TIMEOUT,
        )

    response = await _groq_with_retry(_call)
    raw = response.choices[0].message.content
    from app.services.latex_cleaner import clean_response
    return clean_response(raw)


async def ask_groq_stream(
    user_message: str,
    conversation_history: list = [],
    image_base64: str = None,
    image_type: str = "image/jpeg",
):
    """
    Async generator — yields text chunks as they arrive from Groq.
    Use this for the /teach/ask streaming endpoint.
    """
    messages = await _build_messages(user_message, conversation_history, image_base64, image_type)

    stream = await client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=messages,
        temperature=1,
        max_completion_tokens=8192,
        top_p=1,
        stream=True,
        timeout=_GROQ_TIMEOUT,
    )
    async for chunk in stream:
        token = chunk.choices[0].delta.content
        if token:
            yield token


# ── Internal helpers ──────────────────────────────────────────────────

def _model(image_base64):
    return (
        "meta-llama/llama-4-scout-17b-16e-instruct"
        if image_base64
        else "llama-3.3-70b-versatile"
    )


async def _build_messages(user_message, conversation_history, image_base64, image_type):
    messages = [{"role": "system", "content": SYSTEM_PROMPT}]

    # RAG context — only for text questions
    # if not image_base64 and user_message:
    #     from app.rag.retriever import retrieve_context
    #     context = retrieve_context(user_message)
    #     if context:
    #         messages.append({"role": "system", "content": context})

    # Conversation history
    for turn in conversation_history:
        messages.append(turn)

    # User message
    if image_base64:
        content = [
            {
                "type": "image_url",
                "image_url": {"url": f"data:{image_type};base64,{image_base64}"},
            },
            {
                "type": "text",
                "text": user_message or "Please read this image and solve the mathematics question. Show ALL methods.",
            },
        ]
    else:
        content = user_message

    messages.append({"role": "user", "content": content})
    return messages


