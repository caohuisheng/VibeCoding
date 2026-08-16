"""应用配置：从 .env / 环境变量读取。"""

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env", env_file_encoding="utf-8", extra="ignore"
    )

    # 应用
    app_name: str = "RAG 企业级电商知识库问答系统"
    secret_key: str = "dev-secret-change-me"
    access_token_expire_minutes: int = 60 * 24 * 7  # 7 天

    # 数据库（默认 SQLite，可切 MySQL/PostgreSQL）
    database_url: str = "sqlite:///./data/app.db"

    # 阿里百炼（DashScope）OpenAI 兼容接口
    dashscope_api_key: str = ""
    dashscope_base_url: str = "https://dashscope.aliyuncs.com/compatible-mode/v1"
    llm_model: str = "qwen-plus"
    embedding_model: str = "text-embedding-v3"

    # RAG
    chroma_persist_dir: str = "./data/chroma"
    chunk_size: int = 500
    chunk_overlap: int = 80
    retrieval_k: int = 6
    use_rerank: bool = False

    # 管理员种子账号
    admin_username: str = "admin"
    admin_password: str = "123456"


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
