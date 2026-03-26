"""
backend/app/services/push_service.py

Sends Web Push notifications to subscribed devices.

Install:  pip install pywebpush
Env vars needed in backend .env:
  VAPID_PRIVATE_KEY=<your private key>
  VAPID_PUBLIC_KEY=<your public key>
  VAPID_EMAIL=mailto:you@yourdomain.com

Generate VAPID keys at: https://vapidkeys.com
"""

import os
import json
from pywebpush import webpush, WebPushException


VAPID_PRIVATE = os.environ.get('VAPID_PRIVATE_KEY', '')
VAPID_PUBLIC  = os.environ.get('VAPID_PUBLIC_KEY', '')
VAPID_EMAIL   = os.environ.get('VAPID_EMAIL', 'mailto:admin@mathgenius.app')


def send_push(endpoint: str, p256dh: str, auth_key: str, title: str, body: str, url: str = '/dashboard'):
    """
    Send a single push notification to one device.
    Returns True on success, False on failure.
    Call this from any route or background task.
    """
    if not VAPID_PRIVATE:
        print("[push] VAPID_PRIVATE_KEY not set — skipping push")
        return False

    payload = json.dumps({
        "title": title,
        "body":  body,
        "url":   url,
        "icon":  "/icons/icon-192.png",
        "badge": "/icons/icon-192.png",
    })

    try:
        webpush(
            subscription_info={
                "endpoint": endpoint,
                "keys": {"p256dh": p256dh, "auth": auth_key},
            },
            data=payload,
            vapid_private_key=VAPID_PRIVATE,
            vapid_claims={"sub": VAPID_EMAIL},
        )
        return True
    except WebPushException as e:
        status = e.response.status_code if e.response else None
        if status == 410:
            # Subscription expired — caller should delete it from DB
            raise SubscriptionExpired(endpoint)
        print(f"[push] WebPushException: {e}")
        return False
    except Exception as e:
        print(f"[push] Unexpected error: {e}")
        return False


class SubscriptionExpired(Exception):
    def __init__(self, endpoint):
        self.endpoint = endpoint
        super().__init__(f"Subscription expired: {endpoint}")


async def send_push_to_user(user_id: str, title: str, body: str, url: str = '/dashboard'):
    """
    Send a push to ALL devices a user has subscribed from.
    Dead subscriptions are cleaned up automatically.
    """
    from supabase import create_client
    sb  = create_client(os.environ['SUPABASE_URL'], os.environ['SUPABASE_SERVICE_KEY'])
    res = sb.table('push_subscriptions').select('*').eq('user_id', user_id).execute()

    sent = 0
    for sub in (res.data or []):
        try:
            ok = send_push(sub['endpoint'], sub['p256dh'], sub['auth_key'], title, body, url)
            if ok:
                sent += 1
        except SubscriptionExpired:
            # Clean up expired subscription
            sb.table('push_subscriptions').delete().eq('id', sub['id']).execute()

    return sent