from supabase import create_client
from dotenv import load_dotenv
import os

load_dotenv()
sb = create_client(os.getenv('SUPABASE_URL'), os.getenv('SUPABASE_SERVICE_KEY'))

res = sb.table('theory_questions') \
    .select('question_no,image_url,answer_images') \
    .eq('exam_type', 'WAEC') \
    .eq('year', 2025) \
    .order('question_no') \
    .execute()

print(f"Total questions: {len(res.data)}")
print()

for r in res.data:
    has_img = "YES" if r.get('image_url') else "NO"
    ans     = r.get('answer_images') or []
    print(f"Q{r['question_no']}: question_img={has_img}  answer_imgs={len(ans)}")