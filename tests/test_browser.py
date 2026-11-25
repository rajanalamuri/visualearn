"""Walks through the real site in headless Chrome: sign up, play a lesson to its final card, switch profiles.
Skipped when no Chrome or Chromium is installed."""
import functools
import html
import http.server
import json
import os
import re
import shutil
import subprocess
import tempfile
import threading
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parent.parent
WEB, E2E = ROOT / "web", Path(__file__).resolve().parent / "e2e"


def find_chrome():
    for name in ("google-chrome", "google-chrome-stable", "chromium", "chromium-browser", "chrome"):
        p = shutil.which(name)
        if p:
            return p
    for p in (r"C:\Program Files\Google\Chrome\Application\chrome.exe", r"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",
              r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe", "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"):
        if os.path.exists(p):
            return p
    return None


class Handler(http.server.SimpleHTTPRequestHandler):
    """Serves web/, plus the test pages under /__e2e/."""

    def translate_path(self, path):
        path = path.split("?", 1)[0].split("#", 1)[0]
        if path.startswith("/__e2e/"):
            return str(E2E / path[len("/__e2e/"):])
        return super().translate_path(path)

    def log_message(self, *a):
        pass


@pytest.fixture(scope="module")
def site():
    server = http.server.ThreadingHTTPServer(("127.0.0.1", 0), functools.partial(Handler, directory=str(WEB)))
    threading.Thread(target=server.serve_forever, daemon=True).start()
    yield f"http://127.0.0.1:{server.server_address[1]}"
    server.shutdown()


@pytest.mark.skipif(find_chrome() is None, reason="Chrome or Chromium is not installed")
def test_a_child_signs_up_plays_a_lesson_and_switches_profiles(site):
    with tempfile.TemporaryDirectory() as profile:
        out = subprocess.run(
            [find_chrome(), "--headless=new", "--disable-gpu", "--no-sandbox", f"--user-data-dir={profile}", "--window-size=1100,900",
             "--virtual-time-budget=120000", "--dump-dom", f"{site}/__e2e/flow.html"],
            capture_output=True, text=True, timeout=180).stdout
    m = re.search(r'<pre id="out">(.*?)</pre>', out, re.S)
    assert m, out[-600:]
    result = json.loads(html.unescape(m.group(1)))
    names = [s["name"] for s in result["steps"]]
    assert result["errors"] == [], result["errors"]
    # every stage of the journey actually ran
    for must in ("first visit shows a Sign up chip", "an email is refused with a reason", "header chip shows the nickname",
                 "the lesson reaches its last step", "the final card says the big idea", "Next switched to the next lesson",
                 "the diary lists today's lesson", "switching restores the first diary", "removing a person leaves the other",
                 "home page ends with the closing card", "roadmap ends with its closing card",
                 "the Starter filter hides the harder topics", '"Not really" offers a prefilled email', "the activity pack filters by level"):
        assert must in names, must
    assert len(names) >= 40


def _online(host="www.gstatic.com"):
    import socket
    try:
        socket.create_connection((host, 443), timeout=4).close()
        return True
    except OSError:
        return False


@pytest.mark.skipif(find_chrome() is None or not _online(), reason="needs Chrome and an internet connection")
def test_parent_page_gates_then_offers_google_sign_in(site):
    with tempfile.TemporaryDirectory() as profile:
        out = subprocess.run(
            [find_chrome(), "--headless=new", "--disable-gpu", "--no-sandbox", f"--user-data-dir={profile}", "--window-size=1000,800",
             "--virtual-time-budget=100000", "--dump-dom", f"{site}/__e2e/parents.html"],
            capture_output=True, text=True, timeout=180).stdout
    m = re.search(r'<pre id="out">(.*?)</pre>', out, re.S)
    assert m, out[-500:]
    res = json.loads(html.unescape(m.group(1)))
    assert res["configured"] and res["gateFirst"] and res["wrongAnswerStaysLocked"]
    assert res["signInButtonShown"] and res["signedInPanelHidden"], res
