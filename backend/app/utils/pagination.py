from typing import Generic, TypeVar, List
from pydantic import BaseModel
from sqlalchemy.orm import Query

T = TypeVar("T")


class PaginatedResponse(BaseModel, Generic[T]):
    items: List[T]
    total: int
    page: int
    size: int
    pages: int


def paginate(query: Query, page: int = 1, size: int = 20) -> tuple:
    """Paginate a SQLAlchemy query"""
    if page < 1:
        page = 1
    if size < 1:
        size = 20
    if size > 100:
        size = 100
    
    # Clone the query for count to avoid modifying the original query
    total = query.count()
    # Use the original query for the actual data retrieval
    items = query.offset((page - 1) * size).limit(size).all()
    pages = (total + size - 1) // size if total > 0 else 0
    
    return items, total, page, size, pages
