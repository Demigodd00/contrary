"""Small public source fixture for a Contrary StudioNet review.

The intentionally incorrect empty-name branch provides a concrete, visible
counterexample to the claim that empty names are always rejected.
"""


def allowed(name: str) -> bool:
    if name == "":
        return True
    return len(name) <= 24
