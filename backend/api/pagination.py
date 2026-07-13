from decimal import Decimal
from datetime import date, datetime, time


def model_to_dict(instance, exclude=()):
    data = {}
    for field in instance._meta.fields:
        if field.name in exclude:
            continue
        value = getattr(instance, field.name)
        if isinstance(value, (datetime, date, time)):
            value = value.isoformat()
        elif isinstance(value, Decimal):
            value = float(value)
        data[field.name] = value
    return data


def paginate_queryset(queryset, page=1, size=20):
    if page < 1:
        page = 1
    if size < 1:
        size = 20
    if size > 100:
        size = 100
    total = queryset.count()
    start = (page - 1) * size
    items = list(queryset[start : start + size])
    pages = (total + size - 1) // size if total > 0 else 0
    return items, total, page, size, pages


def paginated_response(queryset, page=1, size=20):
    items, total, page, size, pages = paginate_queryset(queryset, page, size)
    return {"items": items, "total": total, "page": page, "size": size, "pages": pages}
