from __future__ import annotations

from dataclasses import dataclass

import pandas as pd

OFF_PEAK_RATE_GBP_PER_KWH = 0.135
MID_PEAK_RATE_GBP_PER_KWH = 0.145
ON_PEAK_RATE_GBP_PER_KWH = 0.155
CARBON_PRICE_GBP_PER_TON = 85.0


@dataclass(frozen=True)
class TariffBucket:
    name: str
    rate_gbp_per_kwh: float


def get_tariff_bucket(hour_of_day: int) -> TariffBucket:
    if 0 <= hour_of_day < 7 or hour_of_day >= 22:
        return TariffBucket("off_peak", OFF_PEAK_RATE_GBP_PER_KWH)
    if 7 <= hour_of_day < 16:
        return TariffBucket("mid_peak", MID_PEAK_RATE_GBP_PER_KWH)
    return TariffBucket("on_peak", ON_PEAK_RATE_GBP_PER_KWH)


def add_time_features(df: pd.DataFrame, timestamp_column: str) -> pd.DataFrame:
    result = df.copy()
    ts = pd.to_datetime(result[timestamp_column], utc=True)
    result["timestamp_hour"] = ts.dt.hour
    result["day_of_week_name"] = ts.dt.day_name()
    result["day_of_week_number"] = ts.dt.dayofweek
    result["is_weekend"] = ts.dt.dayofweek >= 5
    result["hour_sin"] = __import__("numpy").sin(2 * __import__("numpy").pi * result["timestamp_hour"] / 24)
    result["hour_cos"] = __import__("numpy").cos(2 * __import__("numpy").pi * result["timestamp_hour"] / 24)
    result["month_number"] = ts.dt.month
    return result


def add_tariff_columns(df: pd.DataFrame, hour_column: str = "timestamp_hour") -> pd.DataFrame:
    result = df.copy()
    buckets = result[hour_column].apply(get_tariff_bucket)
    result["tariff_bucket"] = buckets.map(lambda bucket: bucket.name)
    result["tariff_gbp_per_kwh"] = buckets.map(lambda bucket: bucket.rate_gbp_per_kwh)
    return result


def carbon_cost_gbp(carbon_kg: pd.Series) -> pd.Series:
    return (carbon_kg / 1000.0) * CARBON_PRICE_GBP_PER_TON
