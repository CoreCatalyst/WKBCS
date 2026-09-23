import pytest
import pytest_asyncio
from app.core.database import init_db
from app.main import seed_initial_demo_data

@pytest_asyncio.fixture(scope="session", autouse=True)
async def initialize_test_database():
    await init_db()
    await seed_initial_demo_data()
    yield
