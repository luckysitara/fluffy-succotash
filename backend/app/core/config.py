from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List, Optional

class Settings(BaseSettings):
    PROJECT_NAME: str = "OSINT Platform"
    API_V1_STR: str = "/api"

    # JWT Settings
    SECRET_KEY: str = "YOUR_SUPER_SECRET_KEY_CHANGE_THIS_IN_PRODUCTION" # IMPORTANT: Change this in production!
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 8  # 8 hours

    # Database Settings
    DATABASE_URL: str

    # CORS Settings
    BACKEND_CORS_ORIGINS: List[str] = [
        "http://localhost",
        "http://localhost:3000",
        "http://127.0.0.1",
        "http://127.0.0.1:3000",
        "http://localhost:8080", # For backend's own Swagger UI
        # Network access patterns
        "http://192.168.1.*:3000",  # Local network range
        "http://10.0.0.*:3000",     # Private network range
        "http://172.16.*:3000",     # Private network range
    ]

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

settings = Settings()
