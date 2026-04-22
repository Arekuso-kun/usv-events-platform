from __future__ import annotations

import os
from functools import lru_cache

from dotenv import load_dotenv
from pydantic import BaseModel

load_dotenv()


class Settings(BaseModel):
    app_name: str = "USV Events Platform"
    supabase_url: str = ""
    supabase_anon_key: str = ""
    supabase_service_role_key: str | None = None
    supabase_events_table: str = "events"
    supabase_event_registrations_table: str = "event_registrations"
    cors_origins: list[str] = ["*"]


@lru_cache
def get_settings() -> Settings:
    cors_origins = os.getenv("CORS_ORIGINS", "*")

    return Settings(
        app_name=os.getenv("APP_NAME", "USV Events Platform"),
        supabase_url=os.getenv("SUPABASE_URL", ""),
        supabase_anon_key=os.getenv("SUPABASE_ANON_KEY", ""),
        supabase_service_role_key=os.getenv("SUPABASE_SERVICE_ROLE_KEY"),
        supabase_events_table=os.getenv("SUPABASE_EVENTS_TABLE", "events"),
        supabase_event_registrations_table=os.getenv(
            "SUPABASE_EVENT_REGISTRATIONS_TABLE", "event_registrations"
        ),
        cors_origins=[item.strip() for item in cors_origins.split(",") if item.strip()],
    )
