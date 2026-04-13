import os
import httpx
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.environ.get("SUPABASE_URL", "").rstrip("/")
SUPABASE_SERVICE_KEY = os.environ.get("SUPABASE_SERVICE_KEY", "")

HEADERS = {
    "apikey": SUPABASE_SERVICE_KEY,
    "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
}

async def list_tables():
    async with httpx.AsyncClient() as client:
        # This is a common way to get table names from PostgREST
        resp = await client.get(f"{SUPABASE_URL}/rest/v1/", headers=HEADERS)
        print(resp.json())

if __name__ == "__main__":
    import asyncio
    asyncio.run(list_tables())
