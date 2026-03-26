with open("page_dump.html", "r", encoding="utf-8") as f:
    lines = f.readlines()

for i, line in enumerate(lines):
    if "Multiply 3.4" in line:
        start = max(0, i - 15)
        end = min(len(lines), i + 25)
        for j in range(start, end):
            print(f"{j+1}: {lines[j].strip()}")
        break
else:
    print("Not found in file.")
