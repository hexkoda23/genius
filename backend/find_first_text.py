import pdfplumber

with pdfplumber.open('BECE_Mathematics_1990_2012.pdf') as pdf:
    print('Checking pages 7-60 for text vs image-only:\n')
    for i in range(6, 60):
        page = pdf.pages[i]
        text = page.extract_text() or ''
        has_images = len(page.images) > 0
        text_len = len(text.strip())
        status = 'TEXT' if text_len > 50 else ('IMAGE-ONLY' if has_images else 'EMPTY')
        first_line = text.strip().splitlines()[0][:60] if text_len > 0 else ''
        print(f'Page {i+1:3d}: {status:12s} | imgs={len(page.images):2d} | {first_line}')