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
    frontend_url: str = "http://localhost:5173"
    supabase_faculties_table: str = "faculties"
    supabase_departments_table: str = "departments"
    supabase_venues_table: str = "venues"
    supabase_sponsors_table: str = "sponsors"
    supabase_user_profiles_table: str = "user_profiles"
    supabase_event_categories_table: str = "event_categories"
    supabase_events_table: str = "events"
    supabase_event_registrations_table: str = "event_registrations"
    supabase_event_feedback_table: str = "event_feedback"
    supabase_event_materials_table: str = "event_materials"
    supabase_event_sponsors_table: str = "event_sponsors"
    supabase_materials_bucket: str = "event-materials"
    supabase_sponsor_logos_bucket: str = "sponsor-logos"
    cors_origins: list[str] = ["http://localhost:5173"]
    cors_origin_regex: str | None = None


@lru_cache
def get_settings() -> Settings:
    cors_origins = os.getenv("CORS_ORIGINS", "http://localhost:5173")
    cors_origin_regex = os.getenv(
        "CORS_ORIGIN_REGEX",
        r"https?://localhost(:\d+)?",
    )

    return Settings(
        app_name=os.getenv("APP_NAME", "USV Events Platform"),
        supabase_url=os.getenv("SUPABASE_URL", ""),
        supabase_anon_key=os.getenv("SUPABASE_ANON_KEY", ""),
        supabase_service_role_key=os.getenv("SUPABASE_SERVICE_ROLE_KEY"),
        frontend_url=os.getenv("FRONTEND_URL", "http://localhost:5173"),
        cors_origins=[item.strip() for item in cors_origins.split(",") if item.strip()],
        cors_origin_regex=cors_origin_regex or None,
    )
