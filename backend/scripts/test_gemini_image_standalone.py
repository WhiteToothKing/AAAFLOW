"""Minimal Gemini image test: stdlib + httpx only. Loads backend/.env without importing app."""
from __future__ import annotations

import base64
import json
import os
import sys
from pathlib import Path

try:
    import httpx
except ImportError:
    print("Install httpx: pip install httpx")
    sys.exit(1)

MODEL = os.environ.get("GEMINI_MODEL", "gemini-3.1-flash-image-preview")


def _load_dotenv() -> None:
    env_path = Path(__file__).resolve().parent.parent / ".env"
    if not env_path.is_file():
        return
    for line in env_path.read_text(encoding="utf-8", errors="ignore").splitlines():
        s = line.strip()
        if not s or s.startswith("#") or "=" not in s:
            continue
        k, _, v = s.partition("=")
        k, v = k.strip(), v.strip().strip('"').strip("'")
        if k and k not in os.environ:
            os.environ[k] = v


def main() -> None:
    _load_dotenv()
    key = (os.environ.get("GEMINI_API_KEY") or "").strip()
    if not key:
        print("SKIP: GEMINI_API_KEY missing in backend/.env")
        sys.exit(0)

    url = f"https://generativelanguage.googleapis.com/v1beta/models/{MODEL}:generateContent"
    body = {
        "contents": [
            {
                "role": "user",
                "parts": [{"text": "Minimal flat yellow banana icon, white background, no text"}],
            }
        ],
        "generationConfig": {
            "responseModalities": ["TEXT", "IMAGE"],
            "imageConfig": {"aspectRatio": "1:1", "imageSize": "1K"},
        },
    }
    r = httpx.post(url, params={"key": key}, json=body, timeout=120.0)
    if r.status_code != 200:
        print("HTTP", r.status_code, r.text[:500])
        sys.exit(1)
    data = r.json()
    for c in data.get("candidates") or []:
        for part in (c.get("content") or {}).get("parts") or []:
            inline = part.get("inlineData") or part.get("inline_data")
            if inline and inline.get("data"):
                raw = base64.b64decode(inline["data"])
                out = Path(__file__).resolve().parent.parent / "outputs" / "gemini_test_standalone.png"
                out.parent.mkdir(parents=True, exist_ok=True)
                out.write_bytes(raw)
                print("OK: wrote", out)
                return
    print("FAIL: no inline image in JSON keys:", list(data.keys()))
    sys.exit(1)


if __name__ == "__main__":
    main()
