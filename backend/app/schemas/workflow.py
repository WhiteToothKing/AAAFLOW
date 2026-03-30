import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class WorkflowCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = None
    workflow_json: dict
    art_types: list[str] = Field(default_factory=list)
    art_styles: list[str] = Field(default_factory=list)
    version: str = "1.0"


class WorkflowResponse(BaseModel):
    id: uuid.UUID
    name: str
    description: Optional[str] = None
    workflow_json: dict
    art_types: list[str] = []
    art_styles: list[str] = []
    is_active: bool
    version: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class WorkflowUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    workflow_json: Optional[dict] = None
    art_types: Optional[list[str]] = None
    art_styles: Optional[list[str]] = None
    is_active: Optional[bool] = None
    version: Optional[str] = None
