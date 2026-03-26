import pdfplumber, re

with pdfplumber.open('BECE_Mathematics_1990_2012.pdf') as pdf:
    total = len(pdf.pages)
    print('Total pages:', total)
    for i in range(total):
        text = pdf.pages[i].extract_text() or ''
        if re.search(r'April\s+(19|20)\d{2}', text, re.IGNORECASE):
            year = re.search(r'(19|20)\d{2}', text).group()
            lines = [l.strip() for l in text.strip().splitlines() if l.strip()]
            preview = lines[0][:60] if lines else ''
            print('Page ' + str(i+1) + ': April ' + year + ' | lines=' + str(len(lines)) + ' | ' + preview)