import os
import json
from PIL import Image, ImageOps

TOPIC_KEYWORDS = {
    "algebra": ["solve for x", "equation", "formula", "expression", "expansion", "factorize", "polynomial", "quadratic"],
    "geometry": ["triangle", "circle", "angle", "parallel", "perpendicular", "theorem", "polygon", "symmetry"],
    "trigonometry": ["sin", "cos", "tan", "theta", "elevation", "depression", "bearing", "hypotenuse", "right-angled"],
    "statistics": ["mean", "median", "mode", "standard deviation", "variance", "frequency", "histogram", "pie chart"],
    "probability": ["probability", "chance", "random", "die", "dice", "coin", "toss", "selection"],
    "calculus": ["differentiation", "integration", "derivative", "integral", "limit", "rate of change", "dy/dx"],
    "number_theory": ["prime", "factor", "multiple", "hcf", "lcm", "integer", "rational", "base", "binary"],
    "sets": ["union", "intersection", "venn", "subset", "complement", "universal set", "element of"],
    "vectors": ["vector", "magnitude", "direction", "resultant", "scalar", "dot product", "i + j"],
    "matrices": ["matrix", "determinant", "inverse", "adjoint", "singular", "rows", "columns"],
    "sequences_series": ["arithmetic progression", "geometric progression", "A.P", "G.P", "common difference", "common ratio"],
    "coordinate_geometry": ["gradient", "slope", "midpoint", "distance", "intercept", "line", "parabola"],
    "mensuration": ["area", "volume", "perimeter", "surface area", "cylinder", "cone", "sphere", "prism", "sector"],
    "indices_logarithms": ["indices", "logarithm", "log", "antilog", "power", "exponent", "base 10"],
    "surds": ["surd", "rationalize", "conjugate", "square root", "√"],
}

def detect_topic(text):
    text = text.lower()
    for topic, keywords in TOPIC_KEYWORDS.items():
        if any(kw in text for kw in keywords):
            return topic
    return "general"

def process_image(img_path, target_width=800, padding=20):
    """Resize to 800px width with 20px white padding."""
    try:
        with Image.open(img_path) as img:
            # Ensure it's RGB
            if img.mode != 'RGB':
                img = img.convert('RGB')

            # Calculate new height to maintain aspect ratio
            w, h = img.size
            new_h = int((target_width - 2 * padding) * h / w)
            
            # Resize internal image
            img = img.resize((target_width - 2 * padding, new_h), Image.Resampling.LANCZOS)
            
            # Create a new white canvas of 800px width
            # Height will be new_h + double padding
            new_size = (target_width, new_h + 2 * padding)
            new_img = Image.new("RGB", new_size, (255, 255, 255))
            
            # Paste the resized image into the center
            new_img.paste(img, (padding, padding))
            
            # Save back
            new_img.save(img_path, "PNG")
            return True
    except Exception as e:
        print(f"Error processing image {img_path}: {e}")
        return False

def save_metadata(path, data):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)

def append_to_summary(summary_path, exam, year, q_type, count):
    # This will be updated to handle the global summary object
    pass
