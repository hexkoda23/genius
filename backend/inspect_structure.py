import pdfplumber, re

# Check the 4 pages for 2010 (pages 53, 60, 63, 66)
# and the pages between them to understand the full structure

with pdfplumber.open('BECE_Mathematics_1990_2012.pdf') as pdf:
    # Show all 4 April pages for 2010 in full
    for page_num in [53, 60, 63, 66, 78]:  # 78 = first page of 2009
        i = page_num - 1
        text = pdf.pages[i].extract_text() or ''
        print('=' * 60)
        print('PAGE', page_num)
        print('=' * 60)
        print(text[:600])
        print()

    # Also show a sample MCQ page (between pages 53 and 60)
    print('=' * 60)
    print('PAGE 55 (sample MCQ page between year headers)')
    print('=' * 60)
    print((pdf.pages[54].extract_text() or '')[:500])
    print()

    print('=' * 60)
    print('PAGE 57 (another sample between year headers)')
    print('=' * 60)
    print((pdf.pages[56].extract_text() or '')[:500])