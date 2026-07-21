SELECT
    snapshot_date,
    video_id,
    channel_id,
    channel_name,
    title,
    daily_rank,
    daily_movement,
    weekly_movement,
    view_count,
    like_count,
    comment_count,
    video_tags,
    publish_date,
    country,
    langauge
    -- description intentionally dropped (2026-07-21): no component consumes it,
    -- and carrying it through every 5M-row intermediate dominated disk usage.
FROM "YouTube Trending Videos".trending_videos

{{ with_test("count_greater_than", count=0) }}
{{ with_test("not_null", column="snapshot_date") }}
{{ with_test("not_null", column="video_id") }}