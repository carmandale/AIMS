"""RRULE parsing and validation for task scheduling"""

import logging
from datetime import datetime, date
from typing import List, Optional, Dict, Any, Union
from dateutil.rrule import rrule, rruleset, rrulestr, DAILY, WEEKLY, MONTHLY
from dateutil.parser import parse as date_parse
from pydantic import BaseModel, ValidationError

logger = logging.getLogger(__name__)


class ValidationResult(BaseModel):
    """Result of RRULE validation"""

    is_valid: bool
    error_message: Optional[str] = None
    parsed_rule: Optional[Dict[str, Any]] = None


class RRuleParser:
    """Handles RRULE parsing and task generation"""

    def __init__(self):
        self.supported_freqs = {"DAILY": DAILY, "WEEKLY": WEEKLY, "MONTHLY": MONTHLY}

    def parse_rrule(self, rrule_string: str, dtstart: Optional[datetime] = None) -> Union[rrule, rruleset]:
        """Parse an RRULE string into a dateutil.rrule object

        Args:
            rrule_string: RFC 5545 RRULE format string
            dtstart: Optional start date for the rule

        Returns:
            rrule object

        Raises:
            ValueError: If the RRULE string is invalid
        """
        try:
            if not rrule_string.startswith("RRULE:"):
                rrule_string = f"RRULE:{rrule_string}"

            if dtstart is None:
                dtstart = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)

            return rrulestr(rrule_string, dtstart=dtstart)
        except Exception as e:
            logger.error(f"Failed to parse RRULE '{rrule_string}': {e}")
            raise ValueError(f"Invalid RRULE format: {str(e)}")

    def validate_rrule(self, rrule_string: str) -> ValidationResult:
        """Validate an RRULE string

        Args:
            rrule_string: RRULE string to validate

        Returns:
            ValidationResult with validation status and any error messages
        """
        try:
            # Try to parse the rule
            rule = self.parse_rrule(rrule_string)

            # Extract rule components for validation
            rule_dict = {}
            if hasattr(rule, "_freq"):
                rule_dict["frequency"] = self._freq_to_string(rule._freq)
            if hasattr(rule, "_interval"):
                rule_dict["interval"] = rule._interval
            if hasattr(rule, "_byweekday"):
                rule_dict["byweekday"] = rule._byweekday
            if hasattr(rule, "_byhour"):
                rule_dict["byhour"] = rule._byhour
            if hasattr(rule, "_byminute"):
                rule_dict["byminute"] = rule._byminute

            # Test that it can generate at least one occurrence
            test_occurrences = list(
                rule.between(
                    datetime.now(), datetime.now().replace(year=datetime.now().year + 1), inc=True
                )
            )

            if not test_occurrences:
                return ValidationResult(
                    is_valid=False,
                    error_message="Rule does not generate any occurrences in the next year",
                )

            return ValidationResult(is_valid=True, parsed_rule=rule_dict)

        except ValueError as e:
            return ValidationResult(is_valid=False, error_message=str(e))
        except Exception as e:
            logger.error(f"Unexpected error validating RRULE: {e}")
            return ValidationResult(is_valid=False, error_message=f"Unexpected error: {str(e)}")

    def generate_occurrences(
        self, rrule_string: str, start_date: date, end_date: date
    ) -> List[datetime]:
        """Generate occurrences of a recurring rule within a date range

        Args:
            rrule_string: RRULE string
            start_date: Start of date range
            end_date: End of date range

        Returns:
            List of datetime occurrences
        """
        try:
            # Convert dates to datetime
            start_dt = datetime.combine(start_date, datetime.min.time())
            end_dt = datetime.combine(end_date, datetime.max.time())

            # Parse the rule
            rule = self.parse_rrule(rrule_string, dtstart=start_dt)

            # Generate occurrences
            occurrences = list(rule.between(start_dt, end_dt, inc=True))

            logger.debug(
                f"Generated {len(occurrences)} occurrences for rule '{rrule_string}' between {start_date} and {end_date}"
            )
            return occurrences

        except Exception as e:
            logger.error(f"Failed to generate occurrences: {e}")
            return []

    def get_next_occurrence(self, rrule_string: str, after_date: datetime) -> Optional[datetime]:
        """Get the next occurrence of a recurring rule after a given date

        Args:
            rrule_string: RRULE string
            after_date: Date to find next occurrence after

        Returns:
            Next occurrence datetime or None if no future occurrences
        """
        try:
            rule = self.parse_rrule(rrule_string)

            # Get next occurrence
            next_occurrence = rule.after(after_date, inc=False)

            return next_occurrence

        except Exception as e:
            logger.error(f"Failed to get next occurrence: {e}")
            return None

    def _freq_to_string(self, freq: int) -> str:
        """Convert dateutil frequency constant to string"""
        freq_map = {DAILY: "DAILY", WEEKLY: "WEEKLY", MONTHLY: "MONTHLY"}
        return freq_map.get(freq, "UNKNOWN")
