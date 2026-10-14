"""Pinned single-file source for the Contrary v1 milestone demonstration.

Claim under test: allowed("", mode) is False for fast and slow modes.
"""


def allowed(name: str, mode: str) -> bool:
    if mode == "fast":
        return name != ""
    if mode == "slow":
        return name == ""
    return False
