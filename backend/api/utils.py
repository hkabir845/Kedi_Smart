from django.utils.text import slugify as django_slugify


def slugify(text: str) -> str:
    """Create readable, Unicode-safe slugs (including Bengali titles)."""
    return django_slugify(str(text or ""), allow_unicode=True)


def unique_slug(model, text: str, *, max_length: int = 255) -> str:
    """Return a deterministic unique slug without timestamp noise."""
    base = slugify(text)[:max_length].strip("-") or "item"
    candidate = base
    suffix = 2
    while model.objects.filter(slug=candidate).exists():
        suffix_text = f"-{suffix}"
        candidate = f"{base[: max_length - len(suffix_text)].rstrip('-')}{suffix_text}"
        suffix += 1
    return candidate
