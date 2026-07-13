import re
import unicodedata


def slugify(text: str) -> str:
    """Generate a URL-friendly slug from text"""
    # Normalize unicode
    text = unicodedata.normalize("NFKD", text)
    
    # Convert to lowercase and remove special characters
    text = text.lower()
    text = re.sub(r'[^\w\s-]', '', text)
    text = re.sub(r'[-\s]+', '-', text)
    
    # Remove leading/trailing hyphens
    text = text.strip('-')
    
    return text
