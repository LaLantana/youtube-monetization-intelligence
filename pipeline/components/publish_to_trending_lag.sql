WITH enriched AS (
    SELECT
        *,
        CASE country_code
            WHEN 'AE' THEN 'Asia/Dubai'
            WHEN 'AR' THEN 'America/Argentina/Buenos_Aires'
            WHEN 'AT' THEN 'Europe/Vienna'
            WHEN 'AU' THEN 'Australia/Sydney'
            WHEN 'BE' THEN 'Europe/Brussels'
            WHEN 'BG' THEN 'Europe/Sofia'
            WHEN 'BH' THEN 'Asia/Bahrain'
            WHEN 'BO' THEN 'America/La_Paz'
            WHEN 'BR' THEN 'America/Sao_Paulo'
            WHEN 'CA' THEN 'America/Toronto'
            WHEN 'CH' THEN 'Europe/Zurich'
            WHEN 'CL' THEN 'America/Santiago'
            WHEN 'CO' THEN 'America/Bogota'
            WHEN 'CR' THEN 'America/Costa_Rica'
            WHEN 'CY' THEN 'Asia/Nicosia'
            WHEN 'CZ' THEN 'Europe/Prague'
            WHEN 'DE' THEN 'Europe/Berlin'
            WHEN 'DK' THEN 'Europe/Copenhagen'
            WHEN 'DO' THEN 'America/Santo_Domingo'
            WHEN 'DZ' THEN 'Africa/Algiers'
            WHEN 'EC' THEN 'America/Guayaquil'
            WHEN 'EE' THEN 'Europe/Tallinn'
            WHEN 'EG' THEN 'Africa/Cairo'
            WHEN 'ES' THEN 'Europe/Madrid'
            WHEN 'FI' THEN 'Europe/Helsinki'
            WHEN 'FR' THEN 'Europe/Paris'
            WHEN 'GB' THEN 'Europe/London'
            WHEN 'GH' THEN 'Africa/Accra'
            WHEN 'GR' THEN 'Europe/Athens'
            WHEN 'GT' THEN 'America/Guatemala'
            WHEN 'HK' THEN 'Asia/Hong_Kong'
            WHEN 'HN' THEN 'America/Tegucigalpa'
            WHEN 'HR' THEN 'Europe/Zagreb'
            WHEN 'HU' THEN 'Europe/Budapest'
            WHEN 'ID' THEN 'Asia/Jakarta'
            WHEN 'IE' THEN 'Europe/Dublin'
            WHEN 'IL' THEN 'Asia/Jerusalem'
            WHEN 'IN' THEN 'Asia/Kolkata'
            WHEN 'IQ' THEN 'Asia/Baghdad'
            WHEN 'IS' THEN 'Atlantic/Reykjavik'
            WHEN 'IT' THEN 'Europe/Rome'
            WHEN 'JM' THEN 'America/Jamaica'
            WHEN 'JO' THEN 'Asia/Amman'
            WHEN 'JP' THEN 'Asia/Tokyo'
            WHEN 'KE' THEN 'Africa/Nairobi'
            WHEN 'KR' THEN 'Asia/Seoul'
            WHEN 'KW' THEN 'Asia/Kuwait'
            WHEN 'KZ' THEN 'Asia/Almaty'
            WHEN 'LB' THEN 'Asia/Beirut'
            WHEN 'LK' THEN 'Asia/Colombo'
            WHEN 'LT' THEN 'Europe/Vilnius'
            WHEN 'LU' THEN 'Europe/Luxembourg'
            WHEN 'LV' THEN 'Europe/Riga'
            WHEN 'LY' THEN 'Africa/Tripoli'
            WHEN 'MA' THEN 'Africa/Casablanca'
            WHEN 'MT' THEN 'Europe/Malta'
            WHEN 'MX' THEN 'America/Mexico_City'
            WHEN 'MY' THEN 'Asia/Kuala_Lumpur'
            WHEN 'NG' THEN 'Africa/Lagos'
            WHEN 'NI' THEN 'America/Managua'
            WHEN 'NL' THEN 'Europe/Amsterdam'
            WHEN 'NO' THEN 'Europe/Oslo'
            WHEN 'NZ' THEN 'Pacific/Auckland'
            WHEN 'OM' THEN 'Asia/Muscat'
            WHEN 'PA' THEN 'America/Panama'
            WHEN 'PE' THEN 'America/Lima'
            WHEN 'PH' THEN 'Asia/Manila'
            WHEN 'PK' THEN 'Asia/Karachi'
            WHEN 'PL' THEN 'Europe/Warsaw'
            WHEN 'PR' THEN 'America/Puerto_Rico'
            WHEN 'PT' THEN 'Europe/Lisbon'
            WHEN 'PY' THEN 'America/Asuncion'
            WHEN 'QA' THEN 'Asia/Qatar'
            WHEN 'RO' THEN 'Europe/Bucharest'
            WHEN 'RS' THEN 'Europe/Belgrade'
            WHEN 'RU' THEN 'Europe/Moscow'
            WHEN 'SA' THEN 'Asia/Riyadh'
            WHEN 'SE' THEN 'Europe/Stockholm'
            WHEN 'SG' THEN 'Asia/Singapore'
            WHEN 'SI' THEN 'Europe/Ljubljana'
            WHEN 'SK' THEN 'Europe/Bratislava'
            WHEN 'SN' THEN 'Africa/Dakar'
            WHEN 'SV' THEN 'America/El_Salvador'
            WHEN 'TH' THEN 'Asia/Bangkok'
            WHEN 'TN' THEN 'Africa/Tunis'
            WHEN 'TR' THEN 'Europe/Istanbul'
            WHEN 'TW' THEN 'Asia/Taipei'
            WHEN 'TZ' THEN 'Africa/Dar_es_Salaam'
            WHEN 'UA' THEN 'Europe/Kyiv'
            WHEN 'UG' THEN 'Africa/Kampala'
            WHEN 'US' THEN 'America/New_York'
            WHEN 'UY' THEN 'America/Montevideo'
            WHEN 'VE' THEN 'America/Caracas'
            WHEN 'VN' THEN 'Asia/Ho_Chi_Minh'
            WHEN 'YE' THEN 'Asia/Aden'
            WHEN 'ZA' THEN 'Africa/Johannesburg'
            WHEN 'ZW' THEN 'Africa/Harare'
            ELSE 'UTC'
        END AS market_timezone,
        CASE WHEN country_code IS NULL THEN 1 WHEN country_code IN (
            'AE', 'AR', 'AT', 'AU', 'BE', 'BG', 'BH', 'BO', 'BR', 'CA', 'CH', 'CL', 'CO',
            'CR', 'CY', 'CZ', 'DE', 'DK', 'DO', 'DZ', 'EC', 'EE', 'EG', 'ES', 'FI', 'FR',
            'GB', 'GH', 'GR', 'GT', 'HK', 'HN', 'HR', 'HU', 'ID', 'IE', 'IL', 'IN', 'IQ',
            'IS', 'IT', 'JM', 'JO', 'JP', 'KE', 'KR', 'KW', 'KZ', 'LB', 'LK', 'LT', 'LU',
            'LV', 'LY', 'MA', 'MT', 'MX', 'MY', 'NG', 'NI', 'NL', 'NO', 'NZ', 'OM', 'PA',
            'PE', 'PH', 'PK', 'PL', 'PR', 'PT', 'PY', 'QA', 'RO', 'RS', 'RU', 'SA', 'SE',
            'SG', 'SI', 'SK', 'SN', 'SV', 'TH', 'TN', 'TR', 'TW', 'TZ', 'UA', 'UG', 'US',
            'UY', 'VE', 'VN', 'YE', 'ZA', 'ZW'
        ) THEN 0 ELSE 1 END AS market_timezone_fallback_flag
    FROM {{ ref('classify_country_spread') }}
)
SELECT
    *,
    DATEDIFF('second', TRY_CAST(publish_date AS TIMESTAMP), TRY_CAST(snapshot_date AS TIMESTAMP)) / 3600.0 AS publish_to_trending_lag_hours,
    DATEDIFF('second', TRY_CAST(publish_date AS TIMESTAMP), TRY_CAST(snapshot_date AS TIMESTAMP)) / 86400.0 AS publish_to_trending_lag_days,
    CASE
        WHEN TRY_CAST(publish_date AS TIMESTAMP) IS NULL OR TRY_CAST(snapshot_date AS TIMESTAMP) IS NULL THEN 'unknown'
        WHEN DATEDIFF('second', TRY_CAST(publish_date AS TIMESTAMP), TRY_CAST(snapshot_date AS TIMESTAMP)) < 0 THEN 'pre_publish_anomaly'
        WHEN DATEDIFF('second', TRY_CAST(publish_date AS TIMESTAMP), TRY_CAST(snapshot_date AS TIMESTAMP)) < 86400 THEN 'same_day'
        WHEN DATEDIFF('second', TRY_CAST(publish_date AS TIMESTAMP), TRY_CAST(snapshot_date AS TIMESTAMP)) < 259200 THEN 'early_trending'
        WHEN DATEDIFF('second', TRY_CAST(publish_date AS TIMESTAMP), TRY_CAST(snapshot_date AS TIMESTAMP)) < 604800 THEN 'steady_trending'
        ELSE 'delayed_trending'
    END AS publish_to_trending_lag_bucket,
    CURRENT_TIMESTAMP AS publish_to_trending_lag_calculated_at
FROM enriched

{{ with_test("count_greater_than", count=0) }}
{{ with_test("not_null", column="video_id") }}
{{ with_test("not_null", column="snapshot_date") }}