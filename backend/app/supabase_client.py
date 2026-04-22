from __future__ import annotations

from functools import lru_cache

from supabase.lib.client_options import ClientOptions

from supabase import Client, create_client

from .config import get_settings


def _build_client(key: str) -> Client:
    settings = get_settings()
    return create_client(
        settings.supabase_url,
        key,
        options=ClientOptions(
            auto_refresh_token=False,
            persist_session=False,
            schema="public",
        ),
    )


@lru_cache
def get_supabase_anon_client() -> Client:
    return _build_client(get_settings().supabase_anon_key)


@lru_cache
def get_supabase_service_client() -> Client:
    settings = get_settings()
    if not settings.supabase_service_role_key:
        raise RuntimeError(
            "SUPABASE_SERVICE_ROLE_KEY is required for backend operations."
        )
    return _build_client(settings.supabase_service_role_key)
