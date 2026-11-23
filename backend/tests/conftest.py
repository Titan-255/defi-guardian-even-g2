import os
import sys
import pytest
from fastapi.testclient import TestClient

# Add backend directory to sys.path
backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from app.config import settings
# Use a distinct test database for tests
settings.DATABASE_PATH = "test_defi_guardian.db"

from app.database import init_db, reset_paper_database, get_connection
from app.main import app

@pytest.fixture(scope="session", autouse=True)
def setup_test_db():
    init_db()
    reset_paper_database()
    yield
    # Cleanup test db
    test_db = os.path.abspath(settings.DATABASE_PATH)
    if os.path.exists(test_db):
        try:
            os.remove(test_db)
        except Exception:
            pass

@pytest.fixture
def client():
    return TestClient(app)
