import json
import re
import sys
from datetime import datetime, timezone

import pytest


NOW = 2_000_000_000
REPO = "fixture/contrary"
SHA = "a" * 40
SOURCE = "def allowed(name):\n    if name == '':\n        return True\n    return len(name) <= 24\n"
CLAIM_ID = "CT-EMPTY-NAME"


def iso(value):
    return datetime.fromtimestamp(value, tz=timezone.utc).isoformat()


def addr(account):
    return "0x" + account.hex()


@pytest.fixture(autouse=True)
def clock(direct_vm):
    original = direct_vm.warp

    def warp(value):
        original(value)
        for module in tuple(sys.modules.values()):
            raw = getattr(getattr(module, "gl", None), "message_raw", None)
            if isinstance(raw, dict) and "datetime" in raw:
                raw["datetime"] = value

    direct_vm.warp = warp
    warp(iso(NOW))


def mock_source(vm, source=SOURCE):
    vm.mock_web("^" + re.escape("https://api.github.com/repos/" + REPO) + "$", {"status": 200, "body": json.dumps({"id": 42, "private": False, "full_name": REPO})})
    vm.mock_web("^" + re.escape("https://api.github.com/repos/" + REPO + "/git/commits/" + SHA) + "$", {"status": 200, "body": json.dumps({"sha": SHA})})
    vm.mock_web("^" + re.escape("https://raw.githubusercontent.com/" + REPO + "/" + SHA + "/src/validator.py") + "$", {"status": 200, "body": source})


def mock_verdict(vm, scope="IN", proof="PROVEN", quote="if name == '':"):
    vm.mock_llm("CONTRARY_STATIC_CLAIM_V1", json.dumps({"scope": scope, "proof": proof, "quote": quote, "reason": "The empty string follows the true branch."}))


def terms(deadline=NOW + 3600):
    return {"id": CLAIM_ID, "title": "Empty names are rejected", "statement": "allowed(name) always rejects an empty name.",
            "scope": "Call allowed with a Python string using only this source file.", "exclusions": "None; do not infer imported code.",
            "repo": REPO, "commit": SHA, "path": "src/validator.py", "deadline": deadline}


@pytest.fixture
def scenario(direct_vm, direct_deploy, direct_alice, direct_bob):
    mock_source(direct_vm)
    mock_verdict(direct_vm)
    # gltest 0.29.2 expects the legacy universal bundle, absent from rc7 assets.
    # v0.2.16 publishes that bundle and contains the contract's pinned runner.
    contract = direct_deploy("contracts/contrary.py", sdk_version="v0.2.16")
    direct_vm.sender = direct_alice
    direct_vm.deal(direct_alice, 10**18)
    direct_vm.value = 10**16
    contract.create_claim(json.dumps(terms()))
    direct_vm.value = 0
    direct_vm.sender = direct_bob
    direct_vm.deal(direct_bob, 10**18)
    return contract, direct_alice, direct_bob


def submit(vm, scenario):
    contract, _, challenger = scenario
    vm.sender = challenger
    vm.value = 10**15
    contract.submit_counterexample(CLAIM_ID, "name = ''", "False", "True", "The empty string returns True in the explicit branch.")
    vm.value = 0
    return contract
