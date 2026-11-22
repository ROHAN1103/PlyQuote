from datetime import date, datetime
from zoneinfo import ZoneInfo


def today_in(tz_name: str) -> date:
    """Today's date in the business time zone (not the server's)."""
    return datetime.now(ZoneInfo(tz_name)).date()
