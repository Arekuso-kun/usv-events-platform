from __future__ import annotations

from functools import lru_cache
from typing import Dict, Union

from httpx import Timeout
from postgrest import SyncPostgrestClient
from postgrest.utils import SyncClient as PostgrestSyncClient
from supabase.lib.client_options import ClientOptions

from supabase import Client, create_client

from .config import get_settings


class Http1PostgrestClient(SyncPostgrestClient):
    def create_session(
        self,
        base_url: str,
        headers: Dict[str, str],
        timeout: Union[int, float, Timeout],
        verify: bool = True,
    ) -> PostgrestSyncClient:
        return PostgrestSyncClient(
            base_url=base_url,
            headers=headers,
            timeout=timeout,
            verify=verify,
            follow_redirects=True,
            http2=False,
        )


def _build_client(key: str) -> Client:
    settings = get_settings()
    client = create_client(
        settings.supabase_url,
        key,
        options=ClientOptions(
            auto_refresh_token=False,
            persist_session=False,
            postgrest_client_timeout=20,
            schema="public",
        ),
    )
    client.options.headers.update(client._auth_token)
    client._postgrest = Http1PostgrestClient(
        client.rest_url,
        headers=client.options.headers,
        schema=client.options.schema,
        timeout=client.options.postgrest_client_timeout,
    )
    return client


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
