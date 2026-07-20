from __future__ import annotations

from ibis import ir

from ascend.application.context import ComponentExecutionContext
from ascend.resources import ref, test, transform


RPM_LOOKUP = {
    "Film & Animation": 3.5,
    "Autos & Vehicles": 4.5,
    "Music": 2.5,
    "Pets & Animals": 3.0,
    "Sports": 4.0,
    "Travel & Events": 4.5,
    "Gaming": 3.0,
    "People & Blogs": 3.0,
    "Comedy": 2.5,
    "Entertainment": 3.0,
    "News & Politics": 6.0,
    "Howto & Style": 5.5,
    "Education": 7.0,
    "Science & Technology": 6.5,
    "Nonprofits & Activism": 3.5,
}
DEFAULT_RPM = 3.0


@transform(
    inputs=[ref("classify_monetization_quadrants")],
    tests=[
        test("count_greater_than", count=0),
        test("not_null", column="video_id"),
        test("not_null", column="snapshot_date"),
    ],
)
def estimate_video_revenue(
    classify_monetization_quadrants: ir.Table,
    context: ComponentExecutionContext,
) -> ir.Table:
    data = classify_monetization_quadrants
    safe_view_count = data.view_count.fill_null(0)

    rpm = (
        (data.youtube_category_name == "Film & Animation").ifelse(RPM_LOOKUP["Film & Animation"], None)
        .fill_null((data.youtube_category_name == "Autos & Vehicles").ifelse(RPM_LOOKUP["Autos & Vehicles"], None))
        .fill_null((data.youtube_category_name == "Music").ifelse(RPM_LOOKUP["Music"], None))
        .fill_null((data.youtube_category_name == "Pets & Animals").ifelse(RPM_LOOKUP["Pets & Animals"], None))
        .fill_null((data.youtube_category_name == "Sports").ifelse(RPM_LOOKUP["Sports"], None))
        .fill_null((data.youtube_category_name == "Travel & Events").ifelse(RPM_LOOKUP["Travel & Events"], None))
        .fill_null((data.youtube_category_name == "Gaming").ifelse(RPM_LOOKUP["Gaming"], None))
        .fill_null((data.youtube_category_name == "People & Blogs").ifelse(RPM_LOOKUP["People & Blogs"], None))
        .fill_null((data.youtube_category_name == "Comedy").ifelse(RPM_LOOKUP["Comedy"], None))
        .fill_null((data.youtube_category_name == "Entertainment").ifelse(RPM_LOOKUP["Entertainment"], None))
        .fill_null((data.youtube_category_name == "News & Politics").ifelse(RPM_LOOKUP["News & Politics"], None))
        .fill_null((data.youtube_category_name == "Howto & Style").ifelse(RPM_LOOKUP["Howto & Style"], None))
        .fill_null((data.youtube_category_name == "Education").ifelse(RPM_LOOKUP["Education"], None))
        .fill_null((data.youtube_category_name == "Science & Technology").ifelse(RPM_LOOKUP["Science & Technology"], None))
        .fill_null((data.youtube_category_name == "Nonprofits & Activism").ifelse(RPM_LOOKUP["Nonprofits & Activism"], None))
        .fill_null(DEFAULT_RPM)
    )

    multiplier = data.long_form_duration_multiplier.fill_null(1.0)
    estimated_revenue = (safe_view_count / 1000.0) * rpm * multiplier

    return data.mutate(
        estimated_rpm=rpm,
        estimated_revenue=estimated_revenue,
        uncategorized_rpm_fallback_flag=data.youtube_category_name.isnull(),
    )