"""
Image generation service: Dispatches generation requests to the appropriate
provider (DALL-E, Midjourney, or ComfyUI) based on the routing decision.
"""
import json
import time
import uuid
import logging
from typing import Optional

import httpx

from app.core.config import settings
from app.models.task import GenerationProvider

logger = logging.getLogger(__name__)


class ImageGeneratorBase:
    async def generate(
        self,
        prompt: str,
        negative_prompt: str = "",
        width: int = 1024,
        height: int = 1024,
        num_images: int = 1,
        **kwargs,
    ) -> list[dict]:
        raise NotImplementedError


class DallEGenerator(ImageGeneratorBase):
    async def generate(
        self,
        prompt: str,
        negative_prompt: str = "",
        width: int = 1024,
        height: int = 1024,
        num_images: int = 1,
        **kwargs,
    ) -> list[dict]:
        size = self._normalize_size(width, height)
        results = []

        async with httpx.AsyncClient(timeout=120) as client:
            for _ in range(num_images):
                start = time.time()
                response = await client.post(
                    "https://api.openai.com/v1/images/generations",
                    headers={
                        "Authorization": f"Bearer {settings.OPENAI_API_KEY}",
                        "Content-Type": "application/json",
                    },
                    json={
                        "model": settings.DALL_E_MODEL,
                        "prompt": prompt,
                        "n": 1,
                        "size": size,
                        "quality": kwargs.get("quality", "hd"),
                        "style": kwargs.get("style", "vivid"),
                    },
                )
                response.raise_for_status()
                data = response.json()
                elapsed = time.time() - start

                results.append({
                    "image_url": data["data"][0]["url"],
                    "revised_prompt": data["data"][0].get("revised_prompt", ""),
                    "generation_time_seconds": elapsed,
                    "provider": GenerationProvider.DALL_E,
                    "params": {
                        "model": settings.DALL_E_MODEL,
                        "size": size,
                        "quality": kwargs.get("quality", "hd"),
                    },
                })

        return results

    def _normalize_size(self, width: int, height: int) -> str:
        valid_sizes = ["1024x1024", "1024x1792", "1792x1024"]
        requested = f"{width}x{height}"
        if requested in valid_sizes:
            return requested
        ratio = width / height
        if ratio > 1.3:
            return "1792x1024"
        elif ratio < 0.77:
            return "1024x1792"
        return "1024x1024"


class GeminiGenerator(ImageGeneratorBase):
    """Google Gemini native image (Nano Banana) via generateContent + IMAGE modality."""

    @staticmethod
    def _aspect_ratio_for_size(width: int, height: int) -> str:
        if width <= 0 or height <= 0:
            return "1:1"
        r = width / height
        candidates = (
            (1.0, "1:1"),
            (16 / 9, "16:9"),
            (9 / 16, "9:16"),
            (4 / 3, "4:3"),
            (3 / 4, "3:4"),
            (3 / 2, "3:2"),
            (2 / 3, "2:3"),
        )
        best = min(candidates, key=lambda x: abs(r - x[0]))
        return best[1]

    async def generate(
        self,
        prompt: str,
        negative_prompt: str = "",
        width: int = 1024,
        height: int = 1024,
        num_images: int = 1,
        **kwargs,
    ) -> list[dict]:
        if not settings.GEMINI_API_KEY:
            raise ValueError("Gemini API key not configured")

        results = []
        full_prompt = prompt
        if negative_prompt:
            full_prompt += f". Avoid: {negative_prompt}"

        async with httpx.AsyncClient(timeout=120) as client:
            for _ in range(num_images):
                start = time.time()
                aspect = self._aspect_ratio_for_size(width, height)
                response = await client.post(
                    f"https://generativelanguage.googleapis.com/v1beta/models/{settings.GEMINI_MODEL}:generateContent",
                    params={"key": settings.GEMINI_API_KEY},
                    json={
                        "contents": [{"role": "user", "parts": [{"text": full_prompt}]}],
                        "generationConfig": {
                            "responseModalities": ["TEXT", "IMAGE"],
                            "imageConfig": {
                                "aspectRatio": aspect,
                                "imageSize": kwargs.get("gemini_image_size", "1K"),
                            },
                        },
                    },
                )
                response.raise_for_status()
                data = response.json()
                elapsed = time.time() - start

                image_data = self._extract_image(data)
                if image_data:
                    saved_url = await self._save_image(image_data)
                    results.append({
                        "image_url": saved_url,
                        "generation_time_seconds": elapsed,
                        "provider": GenerationProvider.GEMINI,
                        "params": {
                            "model": settings.GEMINI_MODEL,
                            "prompt": prompt[:200],
                            "aspectRatio": aspect,
                        },
                    })
                else:
                    logger.warning(
                        "Gemini returned no image inline data; model=%s keys=%s",
                        settings.GEMINI_MODEL,
                        list((data.get("candidates") or [{}])[0].keys()) if data.get("candidates") else "no candidates",
                    )

        return results

    @staticmethod
    def _extract_image(response_data: dict) -> bytes | None:
        import base64
        try:
            candidates = response_data.get("candidates", [])
            for candidate in candidates:
                parts = candidate.get("content", {}).get("parts", [])
                for part in parts:
                    inline = part.get("inlineData") or part.get("inline_data")
                    if inline and inline.get("data"):
                        return base64.b64decode(inline["data"])
        except Exception:
            pass
        return None

    @staticmethod
    async def _save_image(image_data: bytes) -> str:
        import os
        output_dir = settings.OUTPUT_DIR
        os.makedirs(output_dir, exist_ok=True)
        filename = f"gemini_{uuid.uuid4().hex}.png"
        filepath = os.path.join(output_dir, filename)
        with open(filepath, "wb") as f:
            f.write(image_data)
        return f"/static/outputs/{filename}"


class MidjourneyGenerator(ImageGeneratorBase):
    """Midjourney proxy API integration (requires a third-party Midjourney proxy)."""

    async def generate(
        self,
        prompt: str,
        negative_prompt: str = "",
        width: int = 1024,
        height: int = 1024,
        num_images: int = 1,
        **kwargs,
    ) -> list[dict]:
        if not settings.MIDJOURNEY_API_URL:
            raise ValueError("Midjourney API URL not configured")

        full_prompt = prompt
        if negative_prompt:
            full_prompt += f" --no {negative_prompt}"

        aspect = self._get_aspect_ratio(width, height)
        full_prompt += f" --ar {aspect}"

        results = []
        async with httpx.AsyncClient(timeout=300) as client:
            start = time.time()
            response = await client.post(
                f"{settings.MIDJOURNEY_API_URL}/mj/submit/imagine",
                headers={
                    "Authorization": f"Bearer {settings.MIDJOURNEY_API_KEY}",
                    "Content-Type": "application/json",
                },
                json={"prompt": full_prompt},
            )
            response.raise_for_status()
            data = response.json()
            task_id = data.get("result")

            image_urls = await self._poll_result(client, task_id)
            elapsed = time.time() - start

            for url in image_urls[:num_images]:
                results.append({
                    "image_url": url,
                    "generation_time_seconds": elapsed,
                    "provider": GenerationProvider.MIDJOURNEY,
                    "params": {"prompt": full_prompt, "aspect": aspect},
                })

        return results

    async def _poll_result(self, client: httpx.AsyncClient, task_id: str) -> list[str]:
        import asyncio
        for _ in range(60):
            resp = await client.get(
                f"{settings.MIDJOURNEY_API_URL}/mj/task/{task_id}/fetch"
            )
            data = resp.json()
            if data.get("status") == "SUCCESS":
                return [data.get("imageUrl", "")]
            if data.get("status") == "FAILURE":
                raise RuntimeError(f"Midjourney generation failed: {data}")
            await asyncio.sleep(5)
        raise TimeoutError("Midjourney generation timed out")

    def _get_aspect_ratio(self, w: int, h: int) -> str:
        from math import gcd
        d = gcd(w, h)
        return f"{w // d}:{h // d}"


class JimengGenerator(ImageGeneratorBase):
    """即梦 (Jimeng / 豆包) image generation via Volcengine visual API."""

    async def generate(
        self,
        prompt: str,
        negative_prompt: str = "",
        width: int = 1024,
        height: int = 1024,
        num_images: int = 1,
        **kwargs,
    ) -> list[dict]:
        if not settings.JIMENG_ACCESS_KEY or not settings.JIMENG_SECRET_KEY:
            raise ValueError("Jimeng API keys not configured")

        import hashlib, hmac, datetime as _dt

        width, height = self._clamp_size(width, height)
        results = []

        async with httpx.AsyncClient(timeout=120) as client:
            for _ in range(num_images):
                start = time.time()
                body = {
                    "model": settings.JIMENG_MODEL,
                    "prompt": prompt,
                    "negative_prompt": negative_prompt,
                    "width": width,
                    "height": height,
                    "num": 1,
                }
                now = _dt.datetime.now(_dt.timezone.utc)
                date_str = now.strftime("%Y%m%dT%H%M%SZ")
                payload_json = json.dumps(body, ensure_ascii=False)
                string_to_sign = f"jimeng-api\n{date_str}\n{hashlib.sha256(payload_json.encode()).hexdigest()}"
                signature = hmac.new(
                    settings.JIMENG_SECRET_KEY.encode(),
                    string_to_sign.encode(),
                    hashlib.sha256,
                ).hexdigest()

                response = await client.post(
                    "https://jimeng.jianying.com/v1/images/generations",
                    headers={
                        "Content-Type": "application/json",
                        "X-Date": date_str,
                        "Authorization": f"HMAC-SHA256 Credential={settings.JIMENG_ACCESS_KEY}, Signature={signature}",
                    },
                    content=payload_json,
                )
                response.raise_for_status()
                data = response.json()
                elapsed = time.time() - start

                images = data.get("data", [])
                for img in images[:1]:
                    img_url = img.get("url", "")
                    if not img_url:
                        b64 = img.get("b64_image", "")
                        if b64:
                            img_url = await self._save_b64(b64)
                    if img_url:
                        results.append({
                            "image_url": img_url,
                            "generation_time_seconds": elapsed,
                            "provider": GenerationProvider.JIMENG,
                            "params": {"model": settings.JIMENG_MODEL, "prompt": prompt[:200]},
                        })

        return results

    @staticmethod
    def _clamp_size(w: int, h: int) -> tuple[int, int]:
        w = max(512, min(2048, (w // 64) * 64))
        h = max(512, min(2048, (h // 64) * 64))
        return w, h

    @staticmethod
    async def _save_b64(b64_data: str) -> str:
        import os, base64 as _b64
        output_dir = settings.OUTPUT_DIR
        os.makedirs(output_dir, exist_ok=True)
        filename = f"jimeng_{uuid.uuid4().hex}.png"
        filepath = os.path.join(output_dir, filename)
        with open(filepath, "wb") as f:
            f.write(_b64.b64decode(b64_data))
        return f"/static/outputs/{filename}"


class MiniMaxGenerator(ImageGeneratorBase):
    """MiniMax (海螺 AI) image generation."""

    async def generate(
        self,
        prompt: str,
        negative_prompt: str = "",
        width: int = 1024,
        height: int = 1024,
        num_images: int = 1,
        **kwargs,
    ) -> list[dict]:
        if not settings.MINIMAX_API_KEY:
            raise ValueError("MiniMax API key not configured")

        results = []
        aspect = self._aspect_ratio(width, height)

        async with httpx.AsyncClient(timeout=120) as client:
            for _ in range(num_images):
                start = time.time()
                response = await client.post(
                    "https://api.minimax.chat/v1/image/generation",
                    headers={
                        "Authorization": f"Bearer {settings.MINIMAX_API_KEY}",
                        "Content-Type": "application/json",
                    },
                    json={
                        "model": settings.MINIMAX_MODEL,
                        "prompt": prompt,
                        "negative_prompt": negative_prompt,
                        "aspect_ratio": aspect,
                        "n": 1,
                    },
                )
                response.raise_for_status()
                data = response.json()
                elapsed = time.time() - start

                images = data.get("data", {}).get("images", [])
                for img in images[:1]:
                    img_url = img.get("url", "")
                    if not img_url:
                        b64 = img.get("b64_image", "")
                        if b64:
                            img_url = await self._save_b64(b64)
                    if img_url:
                        results.append({
                            "image_url": img_url,
                            "generation_time_seconds": elapsed,
                            "provider": GenerationProvider.MINIMAX,
                            "params": {"model": settings.MINIMAX_MODEL, "prompt": prompt[:200]},
                        })

        return results

    @staticmethod
    def _aspect_ratio(w: int, h: int) -> str:
        r = w / h if h else 1.0
        if r > 1.3:
            return "16:9"
        if r < 0.77:
            return "9:16"
        if r > 1.1:
            return "4:3"
        if r < 0.9:
            return "3:4"
        return "1:1"

    @staticmethod
    async def _save_b64(b64_data: str) -> str:
        import os, base64 as _b64
        output_dir = settings.OUTPUT_DIR
        os.makedirs(output_dir, exist_ok=True)
        filename = f"minimax_{uuid.uuid4().hex}.png"
        filepath = os.path.join(output_dir, filename)
        with open(filepath, "wb") as f:
            f.write(_b64.b64decode(b64_data))
        return f"/static/outputs/{filename}"


class BananaGenerator(ImageGeneratorBase):
    """Banana Pro image generation."""

    async def generate(
        self,
        prompt: str,
        negative_prompt: str = "",
        width: int = 1024,
        height: int = 1024,
        num_images: int = 1,
        **kwargs,
    ) -> list[dict]:
        if not settings.BANANA_API_KEY:
            raise ValueError("Banana API key not configured")

        results = []
        async with httpx.AsyncClient(timeout=120) as client:
            for _ in range(num_images):
                start = time.time()
                response = await client.post(
                    "https://api.banana.dev/v1/images/generations",
                    headers={
                        "Authorization": f"Bearer {settings.BANANA_API_KEY}",
                        "Content-Type": "application/json",
                    },
                    json={
                        "model": settings.BANANA_MODEL,
                        "prompt": prompt,
                        "negative_prompt": negative_prompt,
                        "width": width,
                        "height": height,
                        "num_images": 1,
                    },
                )
                response.raise_for_status()
                data = response.json()
                elapsed = time.time() - start

                images = data.get("images", data.get("data", []))
                if isinstance(images, list):
                    for img in images[:1]:
                        img_url = img if isinstance(img, str) else img.get("url", "")
                        if img_url:
                            results.append({
                                "image_url": img_url,
                                "generation_time_seconds": elapsed,
                                "provider": GenerationProvider.BANANA,
                                "params": {"model": settings.BANANA_MODEL, "prompt": prompt[:200]},
                            })

        return results


class ImageGeneratorService:
    def __init__(self):
        self.generators: dict[GenerationProvider, ImageGeneratorBase] = {
            GenerationProvider.DALL_E: DallEGenerator(),
            GenerationProvider.GEMINI: GeminiGenerator(),
            GenerationProvider.MIDJOURNEY: MidjourneyGenerator(),
            GenerationProvider.JIMENG: JimengGenerator(),
            GenerationProvider.MINIMAX: MiniMaxGenerator(),
            GenerationProvider.BANANA: BananaGenerator(),
        }

    def get_generator(self, provider: GenerationProvider) -> ImageGeneratorBase:
        gen = self.generators.get(provider)
        if gen is None:
            raise ValueError(f"No generator registered for provider: {provider}")
        return gen

    async def generate(
        self,
        provider: GenerationProvider,
        prompt: str,
        negative_prompt: str = "",
        width: int = 1024,
        height: int = 1024,
        num_images: int = 1,
        **kwargs,
    ) -> list[dict]:
        generator = self.get_generator(provider)
        return await generator.generate(
            prompt=prompt,
            negative_prompt=negative_prompt,
            width=width,
            height=height,
            num_images=num_images,
            **kwargs,
        )


image_generator_service = ImageGeneratorService()
