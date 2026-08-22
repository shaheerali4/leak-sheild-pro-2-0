from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy import delete, desc, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.admin import router as admin_router
from app.api.admin import is_authenticated_admin
from app.database import get_session
from app.models import Finding, Scan
from app.schemas import ScanHistoryItem, ScanRequest, ScanResponse
from app.security import enforce_scan_rate_limit, scan_owner_id
from app.services.scan_service import ScanService

router = APIRouter()
router.include_router(admin_router)


@router.post("/scans", response_model=ScanResponse, status_code=201)
async def create_scan(
    payload: ScanRequest,
    request: Request,
    session: AsyncSession = Depends(get_session),
) -> ScanResponse:
    enforce_scan_rate_limit(request)
    owner_id = scan_owner_id(request)
    admin_authorized = is_authenticated_admin(request.headers.get("authorization"))
    return await ScanService(session, owner_id, admin_authorized=admin_authorized).scan(payload)


@router.get("/scans", response_model=list[ScanHistoryItem])
async def list_scans(
    request: Request,
    session: AsyncSession = Depends(get_session),
    risk_level: str | None = Query(default=None, pattern="^(LOW|MEDIUM|HIGH|CRITICAL)$"),
    q: str | None = Query(default=None, max_length=100),
    limit: int = Query(default=25, ge=1, le=100),
) -> list[ScanHistoryItem]:
    owner_id = scan_owner_id(request)
    stmt = select(Scan).where(Scan.owner_id == owner_id).order_by(desc(Scan.created_at)).limit(limit)
    if risk_level:
        stmt = stmt.where(Scan.overall_level == risk_level.upper())
    if q:
        stmt = stmt.where(Scan.source_name.ilike(f"%{q}%"))
    result = await session.execute(stmt)
    return list(result.scalars().all())


@router.delete("/scans")
async def clear_scans(
    request: Request,
    session: AsyncSession = Depends(get_session),
) -> dict[str, int]:
    owner_id = scan_owner_id(request)
    owned_scan_ids = select(Scan.id).where(Scan.owner_id == owner_id)
    count_result = await session.execute(
        select(func.count()).select_from(Scan).where(Scan.owner_id == owner_id)
    )
    deleted = int(count_result.scalar_one())
    await session.execute(delete(Finding).where(Finding.scan_id.in_(owned_scan_ids)))
    await session.execute(delete(Scan).where(Scan.owner_id == owner_id))
    await session.commit()
    return {"deleted": deleted}


@router.get("/scans/{scan_id}", response_model=ScanResponse)
async def get_scan(
    scan_id: UUID,
    request: Request,
    session: AsyncSession = Depends(get_session),
) -> ScanResponse:
    owner_id = scan_owner_id(request)
    stmt = (
        select(Scan)
        .options(selectinload(Scan.findings))
        .where(Scan.id == str(scan_id), Scan.owner_id == owner_id)
    )
    result = await session.execute(stmt)
    scan = result.scalar_one_or_none()
    if not scan:
        raise HTTPException(status_code=404, detail="Scan not found")
    return ScanService.to_response(scan, cache_hit=False)

