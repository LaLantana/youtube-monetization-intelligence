from __future__ import annotations

import json

import pandas as pd
from ascend.application.context import ComponentExecutionContext
from ascend.common.events import log
from ascend.resources import read, test
from pytrends.request import TrendReq

SAMPLE_KEYWORDS = ["youtube", "mrbeast", "minecraft"]


@read(
    on_schema_change="sync_all_columns",
    tests=[
        test("count_greater_than", count=0),
        test("not_null", column="keyword"),
    ],
)
def inspect_pytrends_payload(context: ComponentExecutionContext) -> pd.DataFrame:
    trends_client = TrendReq(hl="en-US", tz=360)
    trends_client.build_payload(SAMPLE_KEYWORDS, timeframe="today 3-m", geo="US")
    interest_frame = trends_client.interest_over_time().reset_index()
    if interest_frame.empty:
        raise RuntimeError("pytrends inspection returned no rows.")

    observed_columns = list(interest_frame.columns)
    result = interest_frame.head(5).copy()
    result["keyword"] = SAMPLE_KEYWORDS[0]
    result["observed_columns_json"] = json.dumps(observed_columns)
    result["inspection_timestamp"] = pd.Timestamp.utcnow()
    log(f"Observed pytrends columns: {observed_columns}")
    return result