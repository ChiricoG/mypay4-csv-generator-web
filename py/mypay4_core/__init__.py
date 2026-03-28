# SPDX-License-Identifier: EUPL-1.2
"""Core riusabile per MyPay4 Web (browser-only)."""

from .constants import HEADER, FIELDS, FIELD_MAP, SECTIONS
from .validators import validate_row
from .csv_flow import (
    detect_version,
    normalize_rows_to_1_4,
    parse_csv_or_zip_bytes,
    rows_to_csv_bytes,
    rows_to_zip_bytes,
)

__all__ = [
    "HEADER",
    "FIELDS",
    "FIELD_MAP",
    "SECTIONS",
    "validate_row",
    "detect_version",
    "normalize_rows_to_1_4",
    "parse_csv_or_zip_bytes",
    "rows_to_csv_bytes",
    "rows_to_zip_bytes",
]
