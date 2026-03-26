import pdfplumber

with pdfplumber.open('BECE_Mathematics_1990_2012.pdf') as pdf:
    for i in range(6, 15):  # pages 7-15
        text = pdf.pages[i].extract_text() or ''
        if text.strip():
            print('=' * 60)
            print('PAGE', i + 1)
            print('=' * 60)
            print(text[:600])
            print()