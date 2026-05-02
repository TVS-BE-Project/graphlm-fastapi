"""Context-managed SQLAlchemy sessions for non-FastAPI code paths."""

from contextlib import contextmanager

from app.db.database import SessionLocal


@contextmanager
def get_db_session():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
