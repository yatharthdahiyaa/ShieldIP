"""Pydantic models for the API Gateway service."""

from datetime import datetime
from typing import Any, Optional

from pydantic import BaseModel, Field


class APIResponse(BaseModel):
    """Standard JSON envelope for all API responses."""
    success: bool
    data: Any = None
    error: Optional[str] = None
    timestamp: str = Field(default_factory=lambda: datetime.utcnow().isoformat() + "Z")


class AssetRegisterResponse(BaseModel):
    asset_id: str
    filename: str
    media_type: str
    gcs_uri: str
    registered_at: str


class AssetDetail(BaseModel):
    asset_id: str
    filename: str
    media_type: str
    gcs_uri: str
    phash: Optional[str] = None
    registered_at: str


class ViolationSummary(BaseModel):
    violation_id: str
    asset_id: str
    platform: str
    url: str
    region: str
    match_confidence: float
    status: str
    detected_at: str
    enforcement_status: str


class ViolationDetail(ViolationSummary):
    risk_score: Optional[int] = None
    threat_level: Optional[str] = None
    reasoning: Optional[str] = None
    recommended_action: Optional[str] = None
    estimated_revenue_loss: Optional[str] = None
    analysed_at: Optional[str] = None


class EnforceRequest(BaseModel):
    action: str = Field(..., pattern="^(takedown|monetize|legal)$")
    requested_by: str = Field(..., min_length=1, max_length=200)


class PaginationParams(BaseModel):
    page: int = Field(default=1, ge=1)
    page_size: int = Field(default=20, ge=1, le=100)


class AnalyticsSummary(BaseModel):
    total_assets: int
    total_violations: int
    total_enforcements: int
    avg_risk_score: Optional[float] = None
    critical_violations: int
    high_violations: int


class PlatformBreakdown(BaseModel):
    platform: str
    violation_count: int
    avg_confidence: float
