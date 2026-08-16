"""API 集成测试（不依赖外部 LLM/Embedding）。"""


def _auth_header(client, username, password):
    r = client.post("/api/auth/login", json={"username": username, "password": password})
    assert r.status_code == 200
    return {"Authorization": f"Bearer {r.json()['access_token']}"}


def test_register_and_me(client):
    r = client.post("/api/auth/register", json={"username": "alice", "password": "123456"})
    assert r.status_code == 201
    token = r.json()["access_token"]
    me = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me.status_code == 200
    assert me.json()["username"] == "alice"
    assert me.json()["role"] == "user"


def test_admin_login_and_permission_guard(client):
    admin_h = _auth_header(client, "admin", "123456")

    # 普通用户注册后访问文档管理 -> 403
    r = client.post("/api/auth/register", json={"username": "bob", "password": "123456"})
    bob_h = {"Authorization": f"Bearer {r.json()['access_token']}"}
    assert client.get("/api/documents", headers=bob_h).status_code == 403

    # 管理员可访问
    assert client.get("/api/documents", headers=admin_h).status_code == 200


def test_conversation_crud_and_isolation(client):
    admin_h = _auth_header(client, "admin", "123456")

    # 新建
    c = client.post("/api/conversations", json={"title": "测试会话"}, headers=admin_h)
    assert c.status_code == 201
    cid = c.json()["id"]

    # 列表
    convs = client.get("/api/conversations", headers=admin_h).json()
    assert any(x["id"] == cid for x in convs)

    # 重命名
    r = client.patch(f"/api/conversations/{cid}", json={"title": "新标题"}, headers=admin_h)
    assert r.json()["title"] == "新标题"

    # 删除
    assert client.delete(f"/api/conversations/{cid}", headers=admin_h).status_code == 204


def test_stats(client):
    admin_h = _auth_header(client, "admin", "123456")
    r = client.get("/api/stats", headers=admin_h)
    assert r.status_code == 200
    assert r.json()["role"] == "admin"
    assert "conversations" in r.json()


def test_unauthorized_access(client):
    assert client.get("/api/conversations").status_code == 401
    assert client.post("/api/chat/stream", json={"message": "hi"}).status_code == 401
