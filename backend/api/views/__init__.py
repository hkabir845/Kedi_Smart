from datetime import date, datetime, time
from decimal import Decimal

from api.pagination import model_to_dict, paginate_queryset

# Never expose credential fields via generic serializers
SENSITIVE_FIELDS = frozenset({"password_hash", "password"})


def serialize_model(instance, exclude=()):
    """Serialize a Django model matching FastAPI/SQLAlchemy column names."""
    if instance is None:
        return None
    exclude_set = set(exclude) | SENSITIVE_FIELDS
    data = {}
    for field in instance._meta.fields:
        if field.name in exclude_set:
            continue
        value = getattr(instance, field.attname)
        if isinstance(value, (datetime, date, time)):
            value = value.isoformat()
        elif isinstance(value, Decimal):
            value = float(value)
        data[field.column] = value
    return data


def serialize_models(instances, exclude=()):
    return [serialize_model(i, exclude=exclude) for i in instances]


def parse_date(value):
    if value is None or value == "":
        return None
    if isinstance(value, date) and not isinstance(value, datetime):
        return value
    return date.fromisoformat(str(value)[:10])


def parse_datetime(value):
    if value is None or value == "":
        return None
    if isinstance(value, datetime):
        return value
    text = str(value).replace("Z", "+00:00")
    return datetime.fromisoformat(text)


def parse_time(value):
    if value is None or value == "":
        return None
    if isinstance(value, time):
        return value
    text = str(value)
    if len(text.split(":")) == 2:
        text = f"{text}:00"
    return time.fromisoformat(text)


def paginated_dict(queryset, page, size):
    items, total, page, size, pages = paginate_queryset(queryset, page, size)
    return {
        "items": serialize_models(items),
        "total": total,
        "page": page,
        "size": size,
        "pages": pages,
    }
