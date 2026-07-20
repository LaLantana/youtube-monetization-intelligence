from __future__ import annotations

import json
import re
import time
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

import pandas as pd
from ascend.application.context import ComponentExecutionContext
from ascend.common.events import log
from ascend.resources import ref, test, transform

BASE_URL = "https://www.googleapis.com/youtube/v3/videos"
PARTS = "contentDetails,snippet,statistics"
MAX_BATCH_SIZE = 50
DAILY_QUOTA_LIMIT = 9_500
REQUEST_UNIT_COST = 1
MAX_REQUESTS_PER_RUN = 20
CATEGORY_LOOKUP = {
    "1": "Film & Animation",
    "2": "Autos & Vehicles",
    "10": "Music",
    "15": "Pets & Animals",
    "17": "Sports",
    "18": "Short Movies",
    "19": "Travel & Events",
    "20": "Gaming",
    "21": "Videoblogging",
    "22": "People & Blogs",
    "23": "Comedy",
    "24": "Entertainment",
    "25": "News & Politics",
    "26": "Howto & Style",
    "27": "Education",
    "28": "Science & Technology",
    "29": "Nonprofits & Activism",
    "30": "Movies",
    "31": "Anime/Animation",
    "32": "Action/Adventure",
    "33": "Classics",
    "34": "Comedy",
    "35": "Documentary",
    "36": "Drama",
    "37": "Family",
    "38": "Foreign",
    "39": "Horror",
    "40": "Sci-Fi/Fantasy",
    "41": "Thriller",
    "42": "Shorts",
    "43": "Shows",
    "44": "Trailers",
}
ISO_DURATION_PATTERN = re.compile(
    r"^P(?:T(?:(?P<hours>\d+)H)?(?:(?P<minutes>\d+)M)?(?:(?P<seconds>\d+)S)?)$"
)


def _request_json(url: str) -> dict[str, Any]:
    delay_seconds = 1.0
    last_error: Exception | None = None

    for _attempt in range(5):
        try:
            request = Request(
                url,
                headers={
                    "Accept": "application/json",
                    "User-Agent": "AscendYouTubeTrendingEnrichment/1.0",
                },
            )
            with urlopen(request, timeout=60) as response:
                return json.loads(response.read().decode("utf-8"))
        except HTTPError as error:
            last_error = error
            if error.code in {403, 429, 500, 502, 503, 504}:
                retry_after = error.headers.get("Retry-After")
                time.sleep(float(retry_after) if retry_after else delay_seconds)
                delay_seconds *= 2
                continue
            raise
        except (URLError, TimeoutError) as error:
            last_error = error
            time.sleep(delay_seconds)
            delay_seconds *= 2

    raise RuntimeError(f"Failed to fetch YouTube enrichment after retries: {last_error}")


def _parse_iso8601_duration_to_seconds(duration_text: str | None) -> int | None:
    if not duration_text:
        return None

    match = ISO_DURATION_PATTERN.match(duration_text)
    if not match:
        return None

    hours = int(match.group("hours") or 0)
    minutes = int(match.group("minutes") or 0)
    seconds = int(match.group("seconds") or 0)
    return (hours * 3600) + (minutes * 60) + seconds


def _build_video_request_url(api_key: str, video_ids: list[str]) -> str:
    query_string = urlencode(
        {
            "part": PARTS,
            "id": ",".join(video_ids),
            "key": api_key,
            "maxResults": len(video_ids),
        }
    )
    return f"{BASE_URL}?{query_string}"


def _normalize_candidates(youtube_enrichment_candidates: pd.DataFrame) -> pd.DataFrame:
    candidates = youtube_enrichment_candidates.copy()
    if candidates.empty:
        return candidates

    required_columns = {
        "video_id",
        "publish_date",
        "snapshot_date",
        "priority_bucket",
        "enrichment_priority_rank",
    }
    missing_columns = required_columns.difference(candidates.columns)
    if missing_columns:
        raise RuntimeError(f"youtube_enrichment_candidates is missing columns: {sorted(missing_columns)}")

    candidates["video_id"] = candidates["video_id"].astype(str)
    candidates["publish_date"] = pd.to_datetime(candidates["publish_date"], errors="coerce", utc=True)
    candidates["snapshot_date"] = pd.to_datetime(candidates["snapshot_date"], errors="coerce", utc=True)
    candidates["priority_bucket"] = pd.to_numeric(candidates["priority_bucket"], errors="coerce")
    candidates["enrichment_priority_rank"] = pd.to_numeric(candidates["enrichment_priority_rank"], errors="coerce")

    return candidates.sort_values(
        by=["priority_bucket", "publish_date", "snapshot_date", "enrichment_priority_rank"],
        ascending=[True, False, False, True],
        na_position="last",
    ).reset_index(drop=True)


def _build_log_row(
    *,
    run_id: str,
    processed_at: pd.Timestamp,
    video_id: str,
    status: str,
    priority_bucket: Any,
    publish_date: Any,
    snapshot_date: Any,
    quota_units_consumed: int,
    error_message: str | None,
) -> dict[str, Any]:
    return {
        "run_id": run_id,
        "processed_at": processed_at,
        "video_id": video_id,
        "duration_seconds": None,
        "category_name": None,
        "subscriber_count": None,
        "status": status,
        "priority_bucket": priority_bucket,
        "publish_date": publish_date,
        "snapshot_date": snapshot_date,
        "quota_units_consumed": quota_units_consumed,
        "error_message": error_message,
    }


def _get_request_budget() -> int:
    return min(MAX_REQUESTS_PER_RUN, DAILY_QUOTA_LIMIT // REQUEST_UNIT_COST)


def _finalize_result(result_rows: list[dict[str, Any]]) -> pd.DataFrame:
    result = pd.DataFrame(result_rows)
    if result.empty:
        result = pd.DataFrame(
            columns=[
                "run_id",
                "processed_at",
                "video_id",
                "duration_seconds",
                "category_name",
                "subscriber_count",
                "status",
                "priority_bucket",
                "publish_date",
                "snapshot_date",
                "quota_units_consumed",
                "error_message",
            ]
        )

    result["run_id"] = result["run_id"].astype("string")
    result["video_id"] = result["video_id"].astype("string")
    result["status"] = result["status"].astype("string")
    result["category_name"] = result["category_name"].astype("string")
    result["error_message"] = result["error_message"].astype("string")
    result["duration_seconds"] = pd.to_numeric(result["duration_seconds"], errors="coerce")
    result["subscriber_count"] = pd.to_numeric(result["subscriber_count"], errors="coerce")
    result["priority_bucket"] = pd.to_numeric(result["priority_bucket"], errors="coerce")
    result["quota_units_consumed"] = pd.to_numeric(result["quota_units_consumed"], errors="coerce")
    result["processed_at"] = pd.to_datetime(result["processed_at"], errors="coerce", utc=True)
    result["publish_date"] = pd.to_datetime(result["publish_date"], errors="coerce", utc=True)
    result["snapshot_date"] = pd.to_datetime(result["snapshot_date"], errors="coerce", utc=True)
    return result


@transform(
    inputs=[ref("youtube_enrichment_candidates")],
    input_data_format="pandas",
    tests=[
        test("count_greater_than", count=0),
        test("not_null", column="video_id"),
        test("not_null", column="status"),
    ],
)
def read_youtube_video_enrichment(
    youtube_enrichment_candidates: pd.DataFrame,
    context: ComponentExecutionContext,
) -> pd.DataFrame:
    environment_vault = context.vaults.get("environment")
    if environment_vault is None:
        raise RuntimeError("Vault 'environment' is not available in the component context.")

    api_key = environment_vault.get("YOUTUBE_API_KEY")
    if not api_key:
        raise RuntimeError("YOUTUBE_API_KEY is not available in vault 'environment'.")

    candidates = _normalize_candidates(youtube_enrichment_candidates)
    if candidates.empty:
        log("No unenriched YouTube video IDs available for quota-aware processing.")
        return pd.DataFrame(
            columns=[
                "run_id",
                "processed_at",
                "video_id",
                "duration_seconds",
                "category_name",
                "subscriber_count",
                "status",
                "priority_bucket",
                "publish_date",
                "snapshot_date",
                "quota_units_consumed",
                "error_message",
            ]
        )

    run_id = getattr(context, "run_id", None) or getattr(getattr(context, "flow_run", None), "id", "unknown_run")
    processed_at = pd.Timestamp.utcnow()
    result_rows: list[dict[str, Any]] = []
    quota_units_consumed = 0
    request_budget = _get_request_budget()

    if request_budget <= 0:
        raise RuntimeError("Configured YouTube enrichment request budget must be greater than zero.")

    candidate_limit = request_budget * MAX_BATCH_SIZE
    candidates = candidates.head(candidate_limit).reset_index(drop=True)
    log(
        f"Starting quota-aware YouTube enrichment with request_budget={request_budget} "
        f"candidate_limit={candidate_limit} selected_candidates={len(candidates)}"
    )

    for batch_start in range(0, len(candidates), MAX_BATCH_SIZE):
        batch_frame = candidates.iloc[batch_start : batch_start + MAX_BATCH_SIZE].copy()
        batch_video_ids = batch_frame["video_id"].astype(str).tolist()

        if quota_units_consumed >= request_budget or quota_units_consumed + REQUEST_UNIT_COST > DAILY_QUOTA_LIMIT:
            for deferred_row in batch_frame.itertuples(index=False):
                result_rows.append(
                    _build_log_row(
                        run_id=run_id,
                        processed_at=processed_at,
                        video_id=str(deferred_row.video_id),
                        status="deferred_quota",
                        priority_bucket=deferred_row.priority_bucket,
                        publish_date=deferred_row.publish_date,
                        snapshot_date=deferred_row.snapshot_date,
                        quota_units_consumed=quota_units_consumed,
                        error_message=None,
                    )
                )
            continue

        batch_lookup = {
            str(row.video_id): row
            for row in batch_frame.itertuples(index=False)
        }

        try:
            payload = _request_json(_build_video_request_url(api_key=api_key, video_ids=batch_video_ids))
            quota_units_consumed += REQUEST_UNIT_COST
        except Exception as error:
            for failed_row in batch_frame.itertuples(index=False):
                result_rows.append(
                    _build_log_row(
                        run_id=run_id,
                        processed_at=processed_at,
                        video_id=str(failed_row.video_id),
                        status="failed_request",
                        priority_bucket=failed_row.priority_bucket,
                        publish_date=failed_row.publish_date,
                        snapshot_date=failed_row.snapshot_date,
                        quota_units_consumed=quota_units_consumed,
                        error_message=str(error),
                    )
                )
            log(f"YouTube enrichment batch failed for {len(batch_video_ids)} IDs: {error}")
            continue

        returned_ids: set[str] = set()
        for item in payload.get("items", []):
            video_id = str(item.get("id"))
            returned_ids.add(video_id)
            candidate_row = batch_lookup.get(video_id)
            snippet = item.get("snippet", {}) or {}
            content_details = item.get("contentDetails", {}) or {}
            statistics = item.get("statistics", {}) or {}
            category_id = snippet.get("categoryId")
            category_name = CATEGORY_LOOKUP.get(str(category_id)) if category_id is not None else None

            result_rows.append(
                {
                    "run_id": run_id,
                    "processed_at": processed_at,
                    "video_id": video_id,
                    "duration_seconds": _parse_iso8601_duration_to_seconds(content_details.get("duration")),
                    "category_name": category_name,
                    "subscriber_count": pd.to_numeric(statistics.get("subscriberCount"), errors="coerce"),
                    "status": "processed",
                    "priority_bucket": getattr(candidate_row, "priority_bucket", None),
                    "publish_date": getattr(candidate_row, "publish_date", None),
                    "snapshot_date": getattr(candidate_row, "snapshot_date", None),
                    "quota_units_consumed": quota_units_consumed,
                    "error_message": None,
                }
            )

        missing_ids = set(batch_video_ids).difference(returned_ids)
        for missing_video_id in sorted(missing_ids):
            missing_row = batch_lookup[missing_video_id]
            result_rows.append(
                _build_log_row(
                    run_id=run_id,
                    processed_at=processed_at,
                    video_id=missing_video_id,
                    status="missing_response",
                    priority_bucket=missing_row.priority_bucket,
                    publish_date=missing_row.publish_date,
                    snapshot_date=missing_row.snapshot_date,
                    quota_units_consumed=quota_units_consumed,
                    error_message="YouTube API returned no item for requested video_id",
                )
            )

    result = _finalize_result(result_rows)
    log(
        f"Prepared quota-aware YouTube enrichment rows={len(result)} candidates={len(candidates)} "
        f"quota_units_consumed={quota_units_consumed}"
    )
    return result