from __future__ import annotations

import json
import random
import time
from typing import Iterable

import pandas as pd
from ascend.application.context import ComponentExecutionContext
from ascend.common.events import log
from ascend.resources import read, test
from pytrends.request import TrendReq

VALIDATION_KEYWORDS = ["youtube"]
DEFAULT_TIMEFRAME = "today 1-m"
DEFAULT_GEO = "US"


def _build_interest_frame(keywords: Iterable[str]) -> pd.DataFrame:
    trends_client = TrendReq(hl="en-US", tz=360)
    delay_seconds = 5.0
    last_error: Exception | None = None

    for _attempt in range(5):
        try:
            keyword_list = list(keywords)
            time.sleep(delay_seconds + random.uniform(0.5, 2.0))
            trends_client.build_payload(keyword_list, timeframe=DEFAULT_TIMEFRAME, geo=DEFAULT_GEO)
            return trends_client.interest_over_time().reset_index()
        except Exception as error:
            last_error = error
            error_text = str(error)
            if "429" in error_text or "Too Many Requests" in error_text:
                log(f"pytrends rate limited; backing off for {delay_seconds} seconds before retry")
            time.sleep(delay_seconds + random.uniform(1.0, 3.0))
            delay_seconds *= 2

    raise RuntimeError(f"Failed to fetch Google Trends topic interest after retries: {last_error}")


@read(
    on_schema_change="sync_all_columns",
    tests=[
        test("count_greater_than", count=0),
        test("not_null", column="trend_timestamp"),
        test("not_null", column="keyword"),
    ],
)
def read_google_trends_topic_interest(context: ComponentExecutionContext) -> pd.DataFrame:
    interest_frame = _build_interest_frame(VALIDATION_KEYWORDS)
    if interest_frame.empty:
        raise RuntimeError("Google Trends topic interest component returned no rows.")

    observed_columns = list(interest_frame.columns)
    keyword_rows: list[pd.DataFrame] = []

    for keyword in VALIDATION_KEYWORDS:
        if keyword not in interest_frame.columns:
            log(f"Keyword column missing from pytrends response: {keyword}")
            continue

        keyword_frame = pd.DataFrame(
            {
                "trend_timestamp": pd.to_datetime(interest_frame["date"], utc=True),
                "keyword": keyword,
                "interest_score": pd.to_numeric(interest_frame[keyword], errors="coerce"),
                "is_partial": interest_frame.get("isPartial", False),
                "timeframe": DEFAULT_TIMEFRAME,
                "geo": DEFAULT_GEO,
                "observed_columns_json": json.dumps(observed_columns),
                "enriched_at": pd.Timestamp.utcnow(),
            }
        )
        keyword_rows.append(keyword_frame)

    if not keyword_rows:
        raise RuntimeError("Google Trends topic interest returned no keyword columns for validation keywords.")

    result = pd.concat(keyword_rows, ignore_index=True)
    log(
        f"Prepared Google Trends topic interest rows={len(result)} "
        f"keywords={VALIDATION_KEYWORDS} timeframe={DEFAULT_TIMEFRAME} geo={DEFAULT_GEO}"
    )
    return result