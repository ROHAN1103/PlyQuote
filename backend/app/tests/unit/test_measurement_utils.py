from decimal import Decimal as D

import pytest

from app.utils.measurement import format_feet_inches, split_feet_inches, to_feet, to_inches


@pytest.mark.parametrize("feet,inches,expected", [
    (5, "6.5", "66.500"), ("5.5", 0, "66.000"), (0, 66, "66.000"), (8, 0, "96.000"), (0, 0, "0.000"),
    ("5.3333", 0, "64.000"),          # 63.9996 in, rounded half-up to 3 places
    ("0.0416", 0, "0.499"),           # 0.4992 in
])
def test_to_inches(feet, inches, expected):
    assert to_inches(feet, inches) == D(expected)


def test_to_feet_is_exact():
    assert to_feet(D("66")) == D("5.5") and to_feet(D("96")) == D(8)


@pytest.mark.parametrize("inches,expected", [("66.5", (5, "6.5")), ("72", (6, "0")), ("9", (0, "9")), ("0", (0, "0")), ("100.25", (8, "4.25"))])
def test_split_feet_inches(inches, expected):
    feet, rest = split_feet_inches(D(inches))
    assert (feet, rest) == (expected[0], D(expected[1]))


@pytest.mark.parametrize("inches,text", [
    ("66.5", "5' 6.5\""), ("72", "6'"), ("9", "9\""), ("0", "0\""), ("96", "8'"), ("100.25", "8' 4.25\""), ("11.999", "11.999\""),
])
def test_format_feet_inches(inches, text):
    assert format_feet_inches(D(inches)) == text


def test_round_trip():
    for feet, inches in [(5, "6.5"), (8, 0), (0, 11), (7, "3.125")]:
        total = to_inches(feet, inches)
        f, i = split_feet_inches(total)
        assert to_inches(f, i) == total
