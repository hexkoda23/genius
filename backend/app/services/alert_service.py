"""
backend/app/services/alert_service.py

Call check_and_create_alert() after every completed practice session.
It counts consecutive low-scoring sessions and creates/updates a
struggling_alert row when the threshold is crossed.

Usage in your practice route:
    from app.services.alert_service import check_and_create_alert
    await check_and_create_alert(user_id, score, topic)
"""

import os
from supabase import create_client


def get_sb():
    return create_client(
        os.environ['SUPABASE_URL'],
        os.environ['SUPABASE_SERVICE_KEY'],
    )


async def check_and_create_alert(student_id: str, session_score: int, topic: str):
    """
    Called after each practice session completes.
    - If score < threshold: increment sessions_below counter
    - If sessions_below >= 3: create/update a struggling_alert
    - If score >= threshold: reset the counter (student is improving)
    """
    sb        = get_sb()
    threshold = 50  # default — overridden by parent's alert_threshold if set

    # Get student's parent links
    parent_res = sb.table('parent_child') \
        .select('parent_id, profiles!parent_id(parent_email, email_alerts_enabled, alert_threshold)') \
        .eq('child_id', student_id) \
        .execute()

    parents = parent_res.data or []
    if not parents:
        return   # No parent linked — nothing to do

    # Get last 5 sessions to check trend
    sessions_res = sb.table('practice_sessions') \
        .select('score') \
        .eq('user_id', student_id) \
        .eq('status', 'completed') \
        .order('completed_at', desc=True) \
        .limit(5) \
        .execute()

    recent_scores = [s['score'] for s in (sessions_res.data or []) if s.get('score') is not None]
    if not recent_scores:
        return

    # Count how many consecutive recent sessions are below threshold
    sessions_below = 0
    for score in recent_scores:
        if score < threshold:
            sessions_below += 1
        else:
            break   # streak broken — stop counting

    for parent in parents:
        parent_profile = parent.get('profiles') or {}
        parent_id      = parent['parent_id']
        parent_email   = parent_profile.get('parent_email')
        alerts_on      = parent_profile.get('email_alerts_enabled', True)
        p_threshold    = parent_profile.get('alert_threshold', threshold)

        if not parent_email or not alerts_on:
            continue

        avg_score = round(sum(recent_scores) / len(recent_scores))

        if sessions_below >= 3:
            # Upsert alert — create or update if already exists
            sb.table('struggling_alerts').upsert({
                'student_id':     student_id,
                'teacher_id':     parent_id,   # parent_id stored in teacher_id column
                'avg_score':      avg_score,
                'topics':         topic,
                'sessions_below': sessions_below,
                'last_score':     session_score,
                'resolved':       False,
                'email_sent':     False,       # reset so next Edge Function run sends email
            }, on_conflict='student_id,teacher_id').execute()

        elif sessions_below == 0 and avg_score >= p_threshold:
            # Student is improving — resolve the alert
            sb.table('struggling_alerts') \
                .update({'resolved': True, 'resolved_at': 'now()'}) \
                .eq('student_id', student_id) \
                .eq('teacher_id', parent_id) \
                .execute()