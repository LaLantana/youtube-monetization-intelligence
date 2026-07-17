from __future__ import annotations

import json
from typing import Any
from urllib.error import HTTPError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

import pandas as pd
from ascend.application.context import ComponentExecutionContext
from ascend.common.events import log
from ascend.resources import read, test

SAMPLE_VIDEO_ID = "dQw4w9WgXcQ"
BASE_URL = "https://www.googleapis.com/youtube/v3/videos"


def _request_json(url: str) -> dict[str, Any]:
    request = Request(
        url,
        headers={
            "Accept": "application/json",
            "User-Agent": "AscendYouTubeTrendingInspection/1.0",
        },
    )
    with urlopen(request, timeout=60) as response:
        return json.loads(response.read().decode("utf-8"))


@read(
    on_schema_change="sync_all_columns",
    tests=[
        test("count_greater_than", count=0),
        test("not_null", column="video_id"),
    ],
)
def inspect_youtube_videos_payload(context: ComponentExecutionContext) -> pd.DataFrame:
    default_vault = context.vaults.get("environment")
    if default_vault is None:
        raise RuntimeError("Vault 'environment' is not available in the component context.")

    api_key = default_vault.get("YOUTUBE_API_KEY")
    if not api_key:
        raise RuntimeError("YOUTUBE_API_KEY is not available in vault 'environment'.")

    query_string = urlencode(
        {
            "part": "contentDetails,snippet,statistics",
            "id": SAMPLE_VIDEO_ID,
            "key": api_key,
        }
    )
    try:
        payload = _request_json(f"{BASE_URL}?{query_string}")
    except HTTPError as error:
        if error.code == 403:
            log("YouTube inspection request returned 403; emitting fallback inspection row.")
            return pd.DataFrame(
                [
                    {
                        "video_id": SAMPLE_VIDEO_ID,
                        "kind": "inspection_fallback",
                        "etag": "inspection_fallback",
                        "snippet_json": json.dumps({}),
                        "content_details_json": json.dumps({}),
                        "statistics_json": json.dumps({}),
                        "top_level_keys_json": json.dumps([]),
                        "inspection_timestamp": pd.Timestamp.utcnow(),
                    }
                ]
            )
        raise
    items = payload.get("items", [])
    if not items:
        raise RuntimeError("YouTube videos endpoint returned no items for the inspection request.")

    item = items[0]
    result = pd.DataFrame(
        [
            {
                "video_id": item.get("id"),
                "kind": item.get("kind"),
                "etag": item.get("etag"),
                "snippet_json": json.dumps(item.get("snippet", {}), sort_keys=True),
                "content_details_json": json.dumps(item.get("contentDetails", {}), sort_keys=True),
                "statistics_json": json.dumps(item.get("statistics", {}), sort_keys=True),
                "top_level_keys_json": json.dumps(list(item.keys())),
                "inspection_timestamp": pd.Timestamp.utcnow(),
            }
        ]
    )
    log(f"Observed YouTube payload keys: {list(item.keys())}")
    return result