import os
import pytest
import requests

BASE_URL = os.environ['EXPO_PUBLIC_BACKEND_URL'].rstrip('/')
API = f"{BASE_URL}/api"

SAMPLE_EVENTS = """12 | Girls 50m Free | 3
12 | Girls 50m Free | 4
13 | Boys 50m Free | 1"""


@pytest.fixture(scope="module")
def created_meet():
    payload = {"name": "TEST_Summer Invite", "passcode": "swim123", "events_text": SAMPLE_EVENTS}
    r = requests.post(f"{API}/meets", json=payload, timeout=15)
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["passcode"] == "swim123"
    assert len(data["races"]) == 3
    assert data["current_index"] == 0
    assert len(data["code"]) == 6
    return data


# ---------- Meet creation ----------
class TestCreateMeet:
    def test_create_parses_pipe(self, created_meet):
        races = created_meet["races"]
        assert races[0]["event_number"] == "12"
        assert races[0]["event_name"] == "Girls 50m Free"
        assert races[0]["heat_number"] == "3"

    def test_create_validation_missing_name(self):
        r = requests.post(f"{API}/meets", json={"name": "", "passcode": "x", "events_text": "1|A|1"})
        assert r.status_code == 400

    def test_create_validation_no_events(self):
        r = requests.post(f"{API}/meets", json={"name": "TEST_x", "passcode": "x", "events_text": "   "})
        assert r.status_code == 400

    def test_create_parses_comma(self):
        payload = {"name": "TEST_Comma", "passcode": "p", "events_text": "5, Mixed Medley, 2"}
        r = requests.post(f"{API}/meets", json=payload)
        assert r.status_code == 200
        races = r.json()["races"]
        assert races[0]["event_number"] == "5"
        assert races[0]["heat_number"] == "2"


# ---------- Public reads ----------
class TestPublicReads:
    def test_get_by_code_no_passcode(self, created_meet):
        r = requests.get(f"{API}/meets/{created_meet['code']}")
        assert r.status_code == 200
        data = r.json()
        assert "passcode" not in data
        assert data["id"] == created_meet["id"]

    def test_get_by_code_lowercase(self, created_meet):
        r = requests.get(f"{API}/meets/{created_meet['code'].lower()}")
        assert r.status_code == 200
        assert "passcode" not in r.json()

    def test_get_by_id_no_passcode(self, created_meet):
        r = requests.get(f"{API}/meets/id/{created_meet['id']}/read")
        assert r.status_code == 200
        assert "passcode" not in r.json()

    def test_unknown_code_404(self):
        r = requests.get(f"{API}/meets/ZZZZZZ")
        assert r.status_code == 404

    def test_unknown_id_404(self):
        r = requests.get(f"{API}/meets/id/does-not-exist/read")
        assert r.status_code == 404


# ---------- Auth ----------
class TestAuth:
    def test_auth_wrong_passcode_401(self, created_meet):
        r = requests.post(f"{API}/meets/{created_meet['code']}/auth", json={"passcode": "WRONG"})
        assert r.status_code == 401

    def test_auth_correct_returns_full(self, created_meet):
        r = requests.post(f"{API}/meets/{created_meet['code']}/auth", json={"passcode": "swim123"})
        assert r.status_code == 200
        assert r.json()["passcode"] == "swim123"


# ---------- Advance / Previous ----------
class TestAdvancePrevious:
    def test_advance_increments(self, created_meet):
        r = requests.post(f"{API}/meets/{created_meet['id']}/advance", json={"passcode": "swim123"})
        assert r.status_code == 200
        assert r.json()["current_index"] >= 1

    def test_previous_decrements(self, created_meet):
        r = requests.post(f"{API}/meets/{created_meet['id']}/previous", json={"passcode": "swim123"})
        assert r.status_code == 200

    def test_advance_clamped_at_end(self, created_meet):
        n = len(created_meet["races"])
        for _ in range(n + 5):
            requests.post(f"{API}/meets/{created_meet['id']}/advance", json={"passcode": "swim123"})
        r = requests.get(f"{API}/meets/id/{created_meet['id']}/read")
        assert r.json()["current_index"] == n

    def test_previous_clamped_at_zero(self, created_meet):
        for _ in range(20):
            requests.post(f"{API}/meets/{created_meet['id']}/previous", json={"passcode": "swim123"})
        r = requests.get(f"{API}/meets/id/{created_meet['id']}/read")
        assert r.json()["current_index"] == 0

    def test_advance_wrong_passcode_401(self, created_meet):
        r = requests.post(f"{API}/meets/{created_meet['id']}/advance", json={"passcode": "nope"})
        assert r.status_code == 401


# ---------- Update events ----------
class TestUpdateEvents:
    def test_put_events_replaces_and_resets_index(self, created_meet):
        # Advance first
        requests.post(f"{API}/meets/{created_meet['id']}/advance", json={"passcode": "swim123"})
        new_events = "99 | TEST_Replaced | 1\n100 | TEST_Another | 2"
        r = requests.put(
            f"{API}/meets/{created_meet['id']}/events",
            json={"passcode": "swim123", "events_text": new_events},
        )
        assert r.status_code == 200
        data = r.json()
        assert len(data["races"]) == 2
        assert data["current_index"] == 0
        assert data["races"][0]["event_name"] == "TEST_Replaced"

    def test_put_events_wrong_passcode_401(self, created_meet):
        r = requests.put(
            f"{API}/meets/{created_meet['id']}/events",
            json={"passcode": "nope", "events_text": "1|x|1"},
        )
        assert r.status_code == 401
