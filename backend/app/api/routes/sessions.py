from fastapi import APIRouter, HTTPException, Query

from app.infrastructure.db.repositories.results_repository import ResultsRepository
from app.infrastructure.db.repositories.sessions_repository import SessionsRepository
from app.db.session import get_db
from app.shared.utils import now_ms

router = APIRouter()


@router.get("/sessions")
def get_sessions(limit: int = Query(20)):
    with get_db() as conn:
        return SessionsRepository(conn).get_recent(limit=limit)


@router.get("/sessions/{session_id}/results")
def get_session_results(session_id: int):
    with get_db() as conn:
        sessions_repo = SessionsRepository(conn)
        results_repo = ResultsRepository(conn)
        session = sessions_repo.get_by_id(session_id)
        if session is None:
            raise HTTPException(status_code=404, detail="Session not found")
        return results_repo.get_session_results(session["started_at"], session["ended_at"] or now_ms())
