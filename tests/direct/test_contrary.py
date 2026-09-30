import sys

from conftest import CLAIM_ID, NOW, SOURCE, addr, iso, mock_verdict, submit, terms


def test_source_snapshot_and_terms_are_frozen(scenario):
    contract, sponsor, _ = scenario
    claim = contract.get_claim(CLAIM_ID)
    assert claim["source"] == SOURCE
    assert claim["sponsor"] == addr(sponsor).lower()
    assert claim["status"] == "OPEN"
    assert "source" not in contract.list_claims()[0]
    assert contract.get_accounting(addr(sponsor))["locked"] == str(10**16)


def test_proven_counterexample_pays_fixed_amount_after_window(direct_vm, scenario, monkeypatch):
    contract, sponsor, challenger = scenario
    submit(direct_vm, scenario)
    direct_vm.sender = sponsor
    contract.review_counterexample(CLAIM_ID)
    with direct_vm.expect_revert("Rebuttal window is still open"):
        contract.finalize(CLAIM_ID)
    direct_vm.warp(iso(NOW + 601))
    contract.finalize(CLAIM_ID)
    claim = contract.get_claim(CLAIM_ID)
    assert claim["status"] == "PROVEN"
    assert claim["attempts"][0]["assessments"][0]["result"]["outcome"] == "PROVEN"
    assert contract.get_accounting(addr(challenger))["claimable"] == str(11 * 10**15)
    assert contract.get_accounting(addr(sponsor))["claimable"] == "0"
    module = next(m for m in tuple(sys.modules.values()) if getattr(m, "VERSION", None) == "contrary.v0.1.1" and hasattr(m, "Recipient"))
    transfers = []
    class CaptureRecipient:
        def __init__(self, address):
            self.address = str(address).lower()
        def emit_transfer(self, *, value):
            transfers.append((self.address, int(value)))
    monkeypatch.setattr(module, "Recipient", CaptureRecipient)
    direct_vm.sender = challenger
    contract.withdraw()
    assert transfers == [(addr(challenger), 11 * 10**15)]
    assert contract.get_accounting(addr(challenger))["claimable"] == "0"
    assert contract.get_accounting(addr(challenger))["locked"] == "0"
    with direct_vm.expect_revert("No claimable credit"):
        contract.withdraw()


def test_rejected_attempt_credits_stake_but_allows_next_challenger(direct_vm, scenario):
    contract, sponsor, challenger = scenario
    submit(direct_vm, scenario)
    direct_vm.clear_mocks()
    mock_verdict(direct_vm, scope="OUT", proof="UNCLEAR", quote="")
    contract.review_counterexample(CLAIM_ID)
    direct_vm.warp(iso(NOW + 601))
    contract.finalize(CLAIM_ID)
    assert contract.get_claim(CLAIM_ID)["status"] == "OPEN"
    assert contract.get_accounting(addr(sponsor))["claimable"] == str(10**15)
    assert contract.get_accounting(addr(challenger))["claimable"] == "0"
    assert contract.get_accounting(addr(sponsor))["locked"] == str(10**16)
    direct_vm.sender = challenger
    direct_vm.value = 10**15
    contract.submit_counterexample(CLAIM_ID, "name = 'x'", "False", "True", "Second attempt")
    assert len(contract.get_claim(CLAIM_ID)["attempts"]) == 2


def test_inconclusive_returns_stake_and_expiry_returns_reward(direct_vm, scenario):
    contract, sponsor, challenger = scenario
    submit(direct_vm, scenario)
    direct_vm.clear_mocks()
    mock_verdict(direct_vm, scope="IN", proof="UNCLEAR", quote="")
    contract.review_counterexample(CLAIM_ID)
    direct_vm.warp(iso(NOW + 601))
    contract.finalize(CLAIM_ID)
    assert contract.get_accounting(addr(challenger))["claimable"] == str(10**15)
    direct_vm.warp(iso(NOW + 3601))
    contract.close_expired(CLAIM_ID)
    assert contract.get_accounting(addr(sponsor))["claimable"] == str(10**16)
    assert contract.get_accounting(addr(sponsor))["locked"] == "0"


def test_rebuttal_preserves_both_assessments(direct_vm, scenario):
    contract, sponsor, _ = scenario
    submit(direct_vm, scenario)
    contract.review_counterexample(CLAIM_ID)
    direct_vm.sender = sponsor
    direct_vm.clear_mocks()
    mock_verdict(direct_vm, scope="IN", proof="UNCLEAR", quote="")
    contract.rebut_assessment(CLAIM_ID, "The source is not sufficient to establish runtime behavior.")
    reviews = contract.get_claim(CLAIM_ID)["attempts"][0]["assessments"]
    assert [r["result"]["outcome"] for r in reviews] == ["PROVEN", "INCONCLUSIVE"]
    with direct_vm.expect_revert("Rebuttal window closed or already used"):
        contract.rebut_assessment(CLAIM_ID, "Again")
    direct_vm.warp(iso(NOW + 601))
    contract.finalize(CLAIM_ID)
    assert contract.get_claim(CLAIM_ID)["status"] == "OPEN"


def test_unreviewed_attempt_refunds_stake_without_proven_verdict(direct_vm, scenario):
    contract, sponsor, challenger = scenario
    submit(direct_vm, scenario)
    direct_vm.warp(iso(NOW + 86401))
    contract.recover_unreviewed(CLAIM_ID)
    assert contract.get_claim(CLAIM_ID)["attempts"][0]["status"] == "UNREVIEWED"
    assert contract.get_accounting(addr(challenger))["claimable"] == str(10**15)
    assert contract.get_accounting(addr(sponsor))["claimable"] == str(10**16)


def test_rejects_sponsor_and_incorrect_stake(direct_vm, scenario):
    contract, sponsor, challenger = scenario
    direct_vm.sender = sponsor
    direct_vm.value = 10**15
    with direct_vm.expect_revert("Sponsor cannot challenge own claim"):
        contract.submit_counterexample(CLAIM_ID, "x", "y", "z", "argument")
    direct_vm.sender = challenger
    direct_vm.value = 0
    with direct_vm.expect_revert("Exact ten-percent challenge stake required"):
        contract.submit_counterexample(CLAIM_ID, "x", "y", "z", "argument")


def test_bad_quote_cannot_be_proven(direct_vm, scenario):
    contract = submit(direct_vm, scenario)
    direct_vm.clear_mocks()
    mock_verdict(direct_vm, quote="not present in source")
    with direct_vm.expect_revert("Citation is absent"):
        contract.review_counterexample(CLAIM_ID)
    assert contract.get_claim(CLAIM_ID)["status"] == "REVIEW_READY"


def test_validator_recomputes_decision_and_rejects_forged_outcome(direct_vm, scenario, monkeypatch):
    contract = submit(direct_vm, scenario)
    module = next(m for m in tuple(sys.modules.values()) if getattr(m, "VERSION", None) == "contrary.v0.1.1" and hasattr(m, "assess"))
    claim = contract.get_claim(CLAIM_ID)
    attempt = claim["attempts"][0]
    def simulate(leader, validator):
        wrong = {"scope": "OUT", "proof": "UNCLEAR", "quote": "", "reason": "False assertion", "outcome": "REJECTED"}
        assert validator(module.gl.vm.Return(wrong)) is False
        good = leader()
        assert validator(module.gl.vm.Return(good)) is True
        forged = dict(good, outcome="REJECTED")
        assert validator(module.gl.vm.Return(forged)) is False
        return good
    monkeypatch.setattr(module.gl.vm, "run_nondet_unsafe", simulate)
    assert module.assess(claim, attempt, "")["outcome"] == "PROVEN"
