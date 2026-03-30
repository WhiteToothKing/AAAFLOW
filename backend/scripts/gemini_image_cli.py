#!/usr/bin/env python3
"""
Official Gemini native image generation (REST generateContent).
Same API as documented at: https://ai.google.dev/gemini-api/docs/image-generation

Does NOT use MCP. Set GEMINI_API_KEY in environment or backend/.env.

Examples:
  python scripts/gemini_image_cli.py -p "A red apple on white desk, photo"
  python scripts/gemini_image_cli.py -p "..." -o my.png --aspect 16:9 --size 1K
  python scripts/gemini_image_cli.py -p "..." --model gemini-3-pro-image-preview
"""
from __future__ import annotations

import argparse
import base64
import os
import sys
from pathlib import Path

try:
    import httpx
except ImportError:
    print("pip install httpx", file=sys.stderr)
    sys.exit(1)


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


def _extract_image_b64(data: dict) -> tuple[str | None, str]:
    mime = "image/png"
    for c in data.get("candidates") or []:
        for part in (c.get("content") or {}).get("parts") or []:
            inline = part.get("inlineData") or part.get("inline_data")
            if inline and inline.get("data"):
                m = inline.get("mimeType") or inline.get("mime_type") or mime
                return inline["data"], m
    return None, mime


def generate(
    api_key: str,
    prompt: str,
    model: str,
    aspect_ratio: str,
    image_size: str,
    negative: str,
    timeout: float,
) -> bytes:
    full = prompt
    if negative:
        full += f". Avoid: {negative}"

    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"

    def post(body: dict) -> httpx.Response:
        return httpx.post(url, params={"key": api_key}, json=body, timeout=timeout)

    body = {
        "contents": [{"role": "user", "parts": [{"text": full}]}],
        "generationConfig": {
            "responseModalities": ["TEXT", "IMAGE"],
            "imageConfig": {"aspectRatio": aspect_ratio, "imageSize": image_size},
        },
    }
    r = post(body)
    data = r.json() if r.content else {}

    if r.status_code != 200:
        # Retry without imageConfig (some accounts / older behavior)
        body2 = {
            "contents": [{"role": "user", "parts": [{"text": full}]}],
            "generationConfig": {"responseModalities": ["TEXT", "IMAGE"]},
        }
        r = post(body2)
        data = r.json() if r.content else {}

    if r.status_code != 200:
        err = data.get("error", {}) if isinstance(data, dict) else {}
        msg = err.get("message", r.text[:800])
        raise RuntimeError(f"HTTP {r.status_code}: {msg}")

    b64, _mime = _extract_image_b64(data)
    if not b64:
        raise RuntimeError("Response had no image inlineData; check model billing and prompt safety.")

    return base64.b64decode(b64)


def main() -> None:
    _load_dotenv()

    p = argparse.ArgumentParser(description="Gemini official image API (REST)")
    p.add_argument("-p", "--prompt", required=True, help="Text-to-image prompt")
    p.add_argument(
        "-o",
        "--output",
        type=Path,
        default=None,
        help="Output file (.png). Default: backend/outputs/gemini_cli_<ts>.png",
    )
    p.add_argument(
        "--model",
        default=os.environ.get("GEMINI_MODEL", "gemini-3.1-flash-image-preview"),
        help="Image model id (Nano Banana 2 / Pro / 2.5 Flash Image)",
    )
    p.add_argument("--aspect", default="1:1", help="Aspect ratio e.g. 1:1, 16:9, 9:16")
    p.add_argument("--size", default="1K", choices=["512", "1K", "2K", "4K"], help="Output size tier")
    p.add_argument("--negative", default="", help="Negative prompt")
    p.add_argument("--timeout", type=float, default=120.0)
    args = p.parse_args()

    key = (os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY") or "").strip()
    if not key:
        print("Set GEMINI_API_KEY (or GOOGLE_API_KEY) in backend/.env or environment.", file=sys.stderr)
        sys.exit(2)

    out = args.output
    if out is None:
        import time

        out = Path(__file__).resolve().parent.parent / "outputs" / f"gemini_cli_{int(time.time())}.png"

    out.parent.mkdir(parents=True, exist_ok=True)

    try:
        raw = generate(
            key,
            args.prompt,
            args.model,
            args.aspect,
            args.size,
            args.negative,
            args.timeout,
        )
    except Exception as e:
        print(str(e), file=sys.stderr)
        sys.exit(1)

    out.write_bytes(raw)
    print(out.resolve())


if __name__ == "__main__":
    main()
