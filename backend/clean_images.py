from PIL import Image
import os

folder = 'images/waec/2001/theory'
removed = 0

for f in os.listdir(folder):
    path = os.path.join(folder, f)
    try:
        img = Image.open(path)
        w, h = img.size
        if h < 150:
            os.remove(path)
            print(f'Removed: {f} ({w}x{h})')
            removed += 1
    except Exception as e:
        print(f'Skipped {f}: {e}')

print(f'\nTotal removed: {removed}')