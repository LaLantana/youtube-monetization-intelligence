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
    langauge,
    description
FROM "YouTube Trending Videos".trending_videos

{{ with_test("count_greater_than", count=0) }}
{{ with_test("not_null", column="snapshot_date") }}
{{ with_test("not_null", column="video_id") }}