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



# ---------- Messages / Announcements ----------
class TestMessages:
    def test_send_message_returns_newest_first_and_includes_id(self, created_meet):
        meet_id = created_meet["id"]
        # Send first message
        r1 = requests.post(
            f"{API}/meets/{meet_id}/messages",
            json={"passcode": "swim123", "text": "TEST_FIRST announcement"},
        )
        assert r1.status_code == 200, r1.text
        d1 = r1.json()
        assert len(d1["messages"]) >= 1
        assert d1["messages"][0]["text"] == "TEST_FIRST announcement"
        assert "id" in d1["messages"][0] and d1["messages"][0]["id"]
        assert "created_at" in d1["messages"][0]

        # Send second message
        r2 = requests.post(
            f"{API}/meets/{meet_id}/messages",
            json={"passcode": "swim123", "text": "TEST_SECOND announcement"},
        )
        assert r2.status_code == 200
        d2 = r2.json()
        # Newest-first ordering: SECOND must come before FIRST
        assert d2["messages"][0]["text"] == "TEST_SECOND announcement"
        assert d2["messages"][1]["text"] == "TEST_FIRST announcement"

    def test_public_get_exposes_messages_without_passcode(self, created_meet):
        r = requests.get(f"{API}/meets/{created_meet['code']}")
        assert r.status_code == 200
        data = r.json()
        assert "passcode" not in data
        assert isinstance(data.get("messages"), list)
        assert len(data["messages"]) >= 2
        # Verify message shape (id required for dismiss-by-id on frontend)
        m = data["messages"][0]
        assert "id" in m and m["id"]
        assert "text" in m
        # Newest-first preserved on public read
        assert data["messages"][0]["text"] == "TEST_SECOND announcement"

    def test_send_message_wrong_passcode_401(self, created_meet):
        r = requests.post(
            f"{API}/meets/{created_meet['id']}/messages",
            json={"passcode": "nope", "text": "should fail"},
        )
        assert r.status_code == 401

    def test_send_empty_message_400(self, created_meet):
        r = requests.post(
            f"{API}/meets/{created_meet['id']}/messages",
            json={"passcode": "swim123", "text": "   "},
        )
        assert r.status_code == 400


# ---------- Live viewer heartbeat ----------
class TestHeartbeat:
    def test_heartbeat_unknown_code_404(self):
        r = requests.post(f"{API}/meets/ZZZZZZ/heartbeat", json={"viewer_id": "v1"})
        assert r.status_code == 404

    def test_heartbeat_returns_viewers_and_read_reflects(self, created_meet):
        code = created_meet["code"]
        meet_id = created_meet["id"]

        # Use unique viewer ids per test run to avoid collision across modules
        import time as _t
        vid1 = f"TEST_v1_{int(_t.time()*1000)}"
        vid2 = f"TEST_v2_{int(_t.time()*1000)}"

        r1 = requests.post(f"{API}/meets/{code}/heartbeat", json={"viewer_id": vid1})
        assert r1.status_code == 200, r1.text
        body1 = r1.json()
        assert "viewers" in body1
        assert body1["viewers"] >= 1

        r2 = requests.post(f"{API}/meets/{code}/heartbeat", json={"viewer_id": vid2})
        assert r2.status_code == 200
        body2 = r2.json()
        assert body2["viewers"] >= 2

        # Same viewer_id again should NOT add a new viewer
        r3 = requests.post(f"{API}/meets/{code}/heartbeat", json={"viewer_id": vid1})
        assert r3.status_code == 200
        assert r3.json()["viewers"] >= 2

        # GET by id read should reflect live_viewers
        r4 = requests.get(f"{API}/meets/id/{meet_id}/read")
        assert r4.status_code == 200
        data = r4.json()
        assert "live_viewers" in data
        assert isinstance(data["live_viewers"], int)
        assert data["live_viewers"] >= 2
        # public read should NOT leak passcode
        assert "passcode" not in data

    def test_heartbeat_lowercase_code(self, created_meet):
        code = created_meet["code"].lower()
        r = requests.post(f"{API}/meets/{code}/heartbeat", json={"viewer_id": "TEST_vcase"})
        assert r.status_code == 200
        assert r.json()["viewers"] >= 1

    def test_read_by_id_includes_live_viewers_key(self, created_meet):
        r = requests.get(f"{API}/meets/id/{created_meet['id']}/read")
        assert r.status_code == 200
        assert "live_viewers" in r.json()
