import httpx
import asyncio

async def test():
    async with httpx.AsyncClient() as client:
        try:
            r = await client.get('http://localhost:8001/tracking/dashboard-mainframe/test-user')
            print(f"Status: {r.status_code}")
            print(f"Data: {r.json()}")
        except Exception as e:
            print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(test())
