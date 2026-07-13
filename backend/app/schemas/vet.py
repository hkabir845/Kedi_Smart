from pydantic import BaseModel
from typing import Optional, List
from app.models.vet import AppointmentStatus, AppointmentMode
from datetime import datetime, time


class AppointmentStatusUpdate(BaseModel):
    status: AppointmentStatus
