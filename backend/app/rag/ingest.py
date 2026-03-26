import os
import sys
import time
import warnings
import logging

# ── Suppress all noisy warnings before any imports ───────────────────────────
warnings.filterwarnings('ignore')
logging.getLogger('pypdf').setLevel(logging.ERROR)
logging.getLogger('pdfplumber').setLevel(logging.ERROR)
logging.getLogger('sentence_transformers').setLevel(logging.ERROR)
logging.getLogger('transformers').setLevel(logging.ERROR)
os.environ['TOKENIZERS_PARALLELISM']          = 'false'
os.environ['HF_HUB_DISABLE_IMPLICIT_TOKEN']   = '1'
os.environ['HUGGINGFACE_HUB_VERBOSITY']        = 'error'
os.environ['TRANSFORMERS_VERBOSITY']           = 'error'

from pypdf import PdfReader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from qdrant_client import QdrantClient
from qdrant_client.models import Distance, VectorParams, PointStruct
from sentence_transformers import SentenceTransformer

# ── Config ────────────────────────────────────────────────────────────────────
BOOKS_DIR   = os.path.join(os.path.dirname(__file__), '..', '..', 'books')
QDRANT_DIR  = os.path.join(os.path.dirname(__file__), '..', '..', 'qdrant_db')
COLLECTION  = 'mathgenius_books'
EMBED_MODEL = 'all-MiniLM-L6-v2'
VECTOR_SIZE = 384
CHUNK_SIZE    = 1000
CHUNK_OVERLAP = 150

# ── Helpers ───────────────────────────────────────────────────────────────────

def separator(char='─', width=60):
    print(char * width)

def print_step(icon, message):
    print(f"   {icon}  {message}")

def extract_pdf_text(pdf_path: str) -> tuple:
    """
    Extract all text from a PDF.
    Tries pypdf first, falls back to pdfplumber if too many pages fail.
    Never crashes — always returns whatever it can.
    Returns: (full_text, total_pages, successful_pages)
    """
    pages       = []
    failed      = 0
    total_pages = 0

    # ── Strategy 1: pypdf (fast) ──────────────────────────
    try:
        reader      = PdfReader(pdf_path, strict=False)
        total_pages = len(reader.pages)

        for i, page in enumerate(reader.pages):
            try:
                text = page.extract_text()
                if text and text.strip():
                    pages.append(f"[Page {i+1}]\n{text.strip()}")
                else:
                    failed += 1
            except Exception:
                failed += 1

    except Exception as e:
        print_step('⚠️', f"pypdf could not open file: {e}")

    # ── Strategy 2: pdfplumber fallback ───────────────────
    # Use if pypdf found nothing or failed on more than 30% of pages
    need_fallback = (not pages) or (total_pages > 0 and failed / total_pages > 0.3)

    if need_fallback:
        try:
            import pdfplumber
            print_step('🔄', 'Running pdfplumber fallback...')
            pages   = []
            failed  = 0

            with pdfplumber.open(pdf_path) as pdf:
                total_pages = len(pdf.pages)
                for i, page in enumerate(pdf.pages):
                    try:
                        text = page.extract_text()
                        if text and text.strip():
                            pages.append(f"[Page {i+1}]\n{text.strip()}")
                        else:
                            failed += 1
                    except Exception:
                        failed += 1

            good = total_pages - failed
            print_step('✅', f"pdfplumber extracted {good}/{total_pages} pages")

        except Exception as e:
            print_step('❌', f"pdfplumber also failed: {e}")
            print()
            print("      This PDF is likely DRM-protected or scanned.")
            print("      Solutions:")
            print("      1. Download a clean copy from openstax.org (free)")
            print("      2. Borrow from archive.org and download as PDF")
            print("      3. Use OCR software if it is a scanned book")

    successful = total_pages - failed
    return '\n\n'.join(pages), total_pages, successful


def get_ingested_sources(client: QdrantClient) -> set:
    """Returns set of book names already stored in Qdrant."""
    try:
        sources = set()
        offset  = None
        while True:
            results, offset = client.scroll(
                collection_name=COLLECTION,
                limit=100,
                offset=offset,
                with_payload=True,
                with_vectors=False
            )
            for point in results:
                if 'source' in point.payload:
                    sources.add(point.payload['source'])
            if offset is None:
                break
        return sources
    except Exception:
        return set()


def format_duration(seconds: float) -> str:
    if seconds < 60:
        return f"{seconds:.1f}s"
    minutes = int(seconds // 60)
    secs    = int(seconds % 60)
    return f"{minutes}m {secs}s"


# ── Main ingest function ──────────────────────────────────────────────────────

def ingest_books(force_reingest: bool = False):
    separator('═')
    print("  MathGenius — Textbook Ingest Pipeline")
    separator('═')

    os.makedirs(BOOKS_DIR,  exist_ok=True)
    os.makedirs(QDRANT_DIR, exist_ok=True)

    # ── Find PDFs ─────────────────────────────────────────
    pdfs = sorted([f for f in os.listdir(BOOKS_DIR) if f.lower().endswith('.pdf')])

    if not pdfs:
        separator()
        print("⚠️  No PDF files found.")
        print(f"\n   Add your textbooks to:")
        print(f"   {os.path.abspath(BOOKS_DIR)}")
        print()
        print("   Free textbooks (no account needed):")
        print("   • openstax.org  →  Calculus Vol 1, 2, 3")
        print("   • openstax.org  →  Algebra and Trigonometry")
        print("   • openstax.org  →  Precalculus")
        print("   • openstax.org  →  Introductory Statistics")
        separator()
        return

    print(f"\n📚 Found {len(pdfs)} book(s):")
    for pdf in pdfs:
        size_mb = os.path.getsize(os.path.join(BOOKS_DIR, pdf)) / (1024 * 1024)
        print(f"   • {pdf}  ({size_mb:.1f} MB)")

    # ── Load embedding model ──────────────────────────────
    print(f"\n🔧 Loading embedding model  [{EMBED_MODEL}]")
    model = SentenceTransformer(EMBED_MODEL)
    print_step('✅', 'Model ready')

    # ── Set up Qdrant ─────────────────────────────────────
    print(f"\n🔧 Setting up vector database")
    print_step('📁', f"Location: {os.path.abspath(QDRANT_DIR)}")
    client = QdrantClient(path=QDRANT_DIR)

    if force_reingest:
        try:
            client.delete_collection(COLLECTION)
            print_step('🗑️', 'Cleared existing collection')
        except Exception:
            pass

    existing = [c.name for c in client.get_collections().collections]
    if COLLECTION not in existing:
        client.create_collection(
            collection_name=COLLECTION,
            vectors_config=VectorParams(size=VECTOR_SIZE, distance=Distance.COSINE)
        )
        print_step('✨', 'Created new collection')
    else:
        print_step('📂', 'Loaded existing collection')

    # Check already-ingested books
    already_ingested = get_ingested_sources(client)
    if already_ingested:
        print_step('ℹ️', f"Already ingested: {', '.join(already_ingested)}")

    # Text splitter
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=CHUNK_SIZE,
        chunk_overlap=CHUNK_OVERLAP,
        separators=['\n\n', '\n', '. ', '! ', '? ', ' ', '']
    )

    # ── Process each PDF ──────────────────────────────────
    total_chunks  = 0
    skipped_books = 0
    failed_books  = 0
    start_time    = time.time()

    # Start point_id after existing points to avoid collisions
    try:
        point_id = client.get_collection(COLLECTION).points_count
    except Exception:
        point_id = 0

    for pdf_index, pdf_file in enumerate(pdfs, 1):
        book_name = os.path.splitext(pdf_file)[0]
        pdf_path  = os.path.join(BOOKS_DIR, pdf_file)

        separator()
        print(f"📖  [{pdf_index}/{len(pdfs)}]  {book_name}")

        # Skip if already done (unless forcing)
        if book_name in already_ingested and not force_reingest:
            print_step('⏭️', 'Already ingested — skipping')
            print_step('💡', 'Use --force to reingest everything')
            skipped_books += 1
            continue

        # Extract text
        print_step('📄', 'Extracting text from PDF...')
        book_start = time.time()

        try:
            text, total_pages, good_pages = extract_pdf_text(pdf_path)
        except Exception as e:
            print_step('❌', f"Unexpected error reading PDF: {e}")
            failed_books += 1
            continue

        if not text.strip():
            print_step('❌', 'No text extracted — skipping this book')
            failed_books += 1
            continue

        coverage = (good_pages / total_pages * 100) if total_pages > 0 else 0
        print_step('✅', f"{good_pages}/{total_pages} pages extracted  ({coverage:.0f}% coverage)")

        # Chunk the text
        chunks = splitter.split_text(text)
        if not chunks:
            print_step('❌', 'No chunks produced — skipping')
            failed_books += 1
            continue

        avg_chunk = len(text) // len(chunks) if chunks else 0
        print_step('✂️', f"{len(chunks)} chunks created  (avg {avg_chunk} chars each)")

        # Embed and store
        batch_size = 50
        print_step('💾', f"Embedding and storing  [{batch_size} chunks/batch]...")
        print()

        for batch_start in range(0, len(chunks), batch_size):
            batch   = chunks[batch_start : batch_start + batch_size]
            end_idx = min(batch_start + batch_size, len(chunks))

            embeddings = model.encode(batch, show_progress_bar=False).tolist()

            points = [
                PointStruct(
                    id=point_id + batch_start + j,
                    vector=embeddings[j],
                    payload={
                        "source":       book_name,
                        "text":         batch[j],
                        "chunk_index":  batch_start + j,
                        "total_chunks": len(chunks),
                    }
                )
                for j in range(len(batch))
            ]

            try:
                client.upsert(collection_name=COLLECTION, points=points)
            except Exception as e:
                print(f"\n   ⚠️  Batch error at chunk {batch_start}: {e}")
                continue

            # Progress bar
            progress = end_idx / len(chunks)
            filled   = int(30 * progress)
            bar      = '█' * filled + '░' * (30 - filled)
            elapsed  = time.time() - book_start
            eta      = (elapsed / progress - elapsed) if progress > 0 else 0
            print(
                f"   [{bar}]  {end_idx}/{len(chunks)}"
                f"  |  {progress*100:.0f}%"
                f"  |  ETA {format_duration(eta)}   ",
                end='\r'
            )

        point_id     += len(chunks)
        total_chunks += len(chunks)
        book_time     = time.time() - book_start

        print(f"\n")
        print_step('✅', f"Completed in {format_duration(book_time)}  —  {len(chunks)} chunks stored")

    # ── Final summary ─────────────────────────────────────
    total_time = time.time() - start_time
    separator('═')
    print(f"  ✅ Ingest Complete!")
    print(f"     Books processed  : {len(pdfs) - skipped_books - failed_books}")
    print(f"     Books skipped    : {skipped_books}")
    print(f"     Books failed     : {failed_books}")
    print(f"     Total chunks     : {total_chunks}")
    print(f"     Total time       : {format_duration(total_time)}")
    print(f"     Vector database  : {os.path.abspath(QDRANT_DIR)}")
    separator('═')
    print()

    if total_chunks > 0:
        print("  🚀 Textbooks are ready!")
        print("     Euler will now ground answers in your books.")
    else:
        print("  ⚠️  No chunks were stored.")
        print("     Add clean PDFs to the books/ folder and run again.")
    print()


# ── Entry point ───────────────────────────────────────────────────────────────
if __name__ == '__main__':
    force = '--force' in sys.argv
    if force:
        print("\n⚠️  Force mode — all books will be re-ingested from scratch.")
    ingest_books(force_reingest=force)