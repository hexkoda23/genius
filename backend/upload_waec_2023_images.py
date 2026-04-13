import os
import json
import httpx
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.environ.get("SUPABASE_URL", "").rstrip("/")
SUPABASE_SERVICE_KEY = os.environ.get("SUPABASE_SERVICE_KEY", "")

HEADERS = {
    "apikey": SUPABASE_SERVICE_KEY,
    "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
}

async def check_bucket_exists():
    async with httpx.AsyncClient() as client:
        resp = await client.get(f"{SUPABASE_URL}/storage/v1/bucket", headers=HEADERS)
        print(f"Buckets: {resp.json()}")

async def upload_waec_2023_images():
    images_dir = 'images/waec/2023/objectives'
    if not os.path.isdir(images_dir):
        print(f"Directory {images_dir} not found")
        return

    async with httpx.AsyncClient(timeout=30) as client:
        for filename in os.listdir(images_dir):
            if filename.endswith('.png'):
                local_path = os.path.join(images_dir, filename)
                storage_path = f"waec/2023/objectives/{filename}"
                
                with open(local_path, "rb") as f:
                    image_data = f.read()

                resp = await client.post(
                    f"{SUPABASE_URL}/storage/v1/object/question-images/{storage_path}",
                    content=image_data,
                    headers={
                        **HEADERS,
                        "Content-Type": "image/png",
                        "x-upsert": "true",
                    }
                )
                if resp.status_code in (200, 201):
                    print(f"  ✅ Uploaded {filename} to {storage_path}")
                else:
                    print(f"  ❌ Failed to upload {filename}: {resp.text[:200]}")

if __name__ == "__main__":
    import asyncio
    asyncio.run(upload_waec_2023_images())
