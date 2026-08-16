"""pytest 配置：隔离测试数据库，避免污染生产数据。"""

import os

# 必须在导入 app 之前设置环境变量
os.environ["DATABASE_URL"] = "sqlite:///./data/test_app.db"
os.environ["CHROMA_PERSIST_DIR"] = "./data/test_chroma"

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

from app.main import app  # noqa: E402


@pytest.fixture(scope="session")
def client():
    # 清理旧测试数据库，保证每次会话从干净状态开始
    db_path = "./data/test_app.db"
    if os.path.exists(db_path):
        os.remove(db_path)

    with TestClient(app) as c:
        yield c
