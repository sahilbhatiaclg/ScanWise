"""
ScanWise — Rate limiting configuration.

Rate limits are applied via Flask-Limiter decorators on each blueprint.
This module holds shared limit strings.
"""

OTP_REQUEST_LIMIT = "5/minute"
OTP_VERIFY_LIMIT = "10/minute"
SCAN_GUEST_LIMIT = "5/day"
SCAN_USER_LIMIT = "30/day"
ANALYZE_LIMIT = "30/day"
