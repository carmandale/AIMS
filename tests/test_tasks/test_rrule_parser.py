"""Unit tests for RRuleParser"""

import pytest
from datetime import datetime, date, timedelta
from dateutil.rrule import DAILY, WEEKLY, MONTHLY

from src.services.tasks.rrule_parser import RRuleParser, ValidationResult


class TestRRuleParser:
    """Test cases for RRuleParser"""

    def setup_method(self):
        """Set up test fixtures"""
        self.parser = RRuleParser()

    def test_parse_valid_daily_rrule(self):
        """Test parsing a valid daily RRULE"""
        rrule_string = "RRULE:FREQ=DAILY;BYDAY=MO,TU,WE,TH,FR"
        rule = self.parser.parse_rrule(rrule_string)

        assert rule is not None
        assert rule._freq == DAILY
        assert len(rule._byweekday) == 5  # Monday through Friday

    def test_parse_valid_weekly_rrule(self):
        """Test parsing a valid weekly RRULE"""
        rrule_string = "RRULE:FREQ=WEEKLY;BYDAY=FR;BYHOUR=14"
        rule = self.parser.parse_rrule(rrule_string)

        assert rule is not None
        assert rule._freq == WEEKLY
        assert rule._byhour == (14,)

    def test_parse_valid_monthly_rrule(self):
        """Test parsing a valid monthly RRULE"""
        rrule_string = "RRULE:FREQ=MONTHLY;BYMONTHDAY=1;BYHOUR=9"
        rule = self.parser.parse_rrule(rrule_string)

        assert rule is not None
        assert rule._freq == MONTHLY
        assert rule._bymonthday == (1,)
        assert rule._byhour == (9,)

    def test_parse_rrule_without_prefix(self):
        """Test parsing RRULE without RRULE: prefix"""
        rrule_string = "FREQ=DAILY;INTERVAL=1"
        rule = self.parser.parse_rrule(rrule_string)

        assert rule is not None
        assert rule._freq == DAILY
        assert rule._interval == 1

    def test_parse_invalid_rrule_raises_error(self):
        """Test parsing invalid RRULE raises ValueError"""
        with pytest.raises(ValueError, match="Invalid RRULE format"):
            self.parser.parse_rrule("INVALID_RRULE_STRING")

    def test_validate_valid_rrule(self):
        """Test validating a valid RRULE"""
        rrule_string = "RRULE:FREQ=DAILY;BYDAY=MO,TU,WE,TH,FR"
        result = self.parser.validate_rrule(rrule_string)

        assert result.is_valid is True
        assert result.error_message is None
        assert result.parsed_rule is not None
        assert result.parsed_rule["frequency"] == "DAILY"

    def test_validate_invalid_rrule(self):
        """Test validating an invalid RRULE"""
        result = self.parser.validate_rrule("INVALID_RRULE")

        assert result.is_valid is False
        assert result.error_message is not None
        assert "Invalid RRULE format" in result.error_message

    def test_validate_rrule_with_no_occurrences(self):
        """Test validating RRULE that generates no occurrences"""
        # This RRULE would generate occurrences only on Feb 30th (which doesn't exist)
        rrule_string = "RRULE:FREQ=YEARLY;BYMONTH=2;BYMONTHDAY=30"
        result = self.parser.validate_rrule(rrule_string)

        assert result.is_valid is False
        assert "does not generate any occurrences" in result.error_message

    def test_generate_occurrences_daily(self):
        """Test generating daily occurrences"""
        rrule_string = "RRULE:FREQ=DAILY"
        start_date = date(2025, 7, 16)
        end_date = date(2025, 7, 20)

        occurrences = self.parser.generate_occurrences(rrule_string, start_date, end_date)

        assert len(occurrences) == 5  # 5 days inclusive
        assert occurrences[0].date() == start_date
        assert occurrences[-1].date() == end_date

    def test_generate_occurrences_weekly(self):
        """Test generating weekly occurrences"""
        rrule_string = "RRULE:FREQ=WEEKLY;BYDAY=MO"
        start_date = date(2025, 7, 1)  # Tuesday
        end_date = date(2025, 7, 31)

        occurrences = self.parser.generate_occurrences(rrule_string, start_date, end_date)

        # Should get all Mondays in July 2025
        assert len(occurrences) == 4
        for occ in occurrences:
            assert occ.weekday() == 0  # Monday

    def test_generate_occurrences_with_hour(self):
        """Test generating occurrences with specific hour"""
        rrule_string = "RRULE:FREQ=DAILY;BYHOUR=14;BYMINUTE=30"
        start_date = date(2025, 7, 16)
        end_date = date(2025, 7, 17)

        occurrences = self.parser.generate_occurrences(rrule_string, start_date, end_date)

        assert len(occurrences) == 2
        for occ in occurrences:
            assert occ.hour == 14
            assert occ.minute == 30

    def test_generate_occurrences_empty_for_invalid_rrule(self):
        """Test that invalid RRULE returns empty list"""
        occurrences = self.parser.generate_occurrences(
            "INVALID_RRULE", date(2025, 7, 16), date(2025, 7, 20)
        )

        assert occurrences == []

    def test_get_next_occurrence(self):
        """Test getting next occurrence after a date"""
        rrule_string = "RRULE:FREQ=DAILY;BYHOUR=10"
        after_date = datetime(2025, 7, 16, 15, 0)  # 3 PM

        next_occ = self.parser.get_next_occurrence(rrule_string, after_date)

        assert next_occ is not None
        # Should be the next day at 10 AM (since after_date is 3 PM, next 10 AM is tomorrow)
        expected_date = after_date.date() + timedelta(days=1)
        assert next_occ.date() == expected_date
        assert next_occ.hour == 10

    def test_get_next_occurrence_none_for_invalid_rrule(self):
        """Test that invalid RRULE returns None for next occurrence"""
        next_occ = self.parser.get_next_occurrence("INVALID_RRULE", datetime(2025, 7, 16))

        assert next_occ is None

    def test_freq_to_string(self):
        """Test frequency constant to string conversion"""
        assert self.parser._freq_to_string(DAILY) == "DAILY"
        assert self.parser._freq_to_string(WEEKLY) == "WEEKLY"
        assert self.parser._freq_to_string(MONTHLY) == "MONTHLY"
        assert self.parser._freq_to_string(999) == "UNKNOWN"
