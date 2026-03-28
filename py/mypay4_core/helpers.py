# SPDX-License-Identifier: EUPL-1.2
def to_float(val: object, silent: bool = False) -> float | None:
    if val is None:
        return None
    try:
        if isinstance(val, str):
            return float(val.replace(",", ".").strip())
        return float(val)
    except (ValueError, TypeError):
        return None


def is_float(s: object) -> bool:
    return to_float(s, silent=True) is not None
