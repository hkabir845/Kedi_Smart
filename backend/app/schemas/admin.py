from pydantic import BaseModel
from typing import Optional


class VerificationReject(BaseModel):
    notes: str


class VerificationApprove(BaseModel):
    notes: Optional[str] = None


class ModerationApprove(BaseModel):
    notes: Optional[str] = None


class ModerationReject(BaseModel):
    notes: str
