"""
ComfyUI Integration Service: Manages workflow submission, HTTP polling for
progress, and result retrieval from a ComfyUI server.

Key fixes over initial version:
- Checks execution status_str and errors in history response
- Handles connection failures with retries and clear error messages
- Supports custom workflow_json properly (node-ID-agnostic injection)
- Image proxy endpoint for cross-origin access
"""
import json
import uuid
import time
import asyncio
import logging
from typing import Optional
from urllib.parse import urlencode

import httpx

from app.core.config import settings
from app.models.task import GenerationProvider

logger = logging.getLogger(__name__)

NODE_ID_POSITIVE_PROMPT = "6"
NODE_ID_NEGATIVE_PROMPT = "7"
NODE_ID_LATENT = "5"
NODE_ID_CHECKPOINT = "4"
NODE_ID_SAMPLER = "3"

DEFAULT_WORKFLOW = {
    NODE_ID_SAMPLER: {
        "class_type": "KSampler",
        "inputs": {
            "cfg": 7.5,
            "denoise": 1.0,
            "latent_image": [NODE_ID_LATENT, 0],
            "model": [NODE_ID_CHECKPOINT, 0],
            "negative": [NODE_ID_NEGATIVE_PROMPT, 0],
            "positive": [NODE_ID_POSITIVE_PROMPT, 0],
            "sampler_name": "dpmpp_2m",
            "scheduler": "karras",
            "seed": -1,
            "steps": 30,
        },
    },
    NODE_ID_CHECKPOINT: {
        "class_type": "CheckpointLoaderSimple",
        "inputs": {"ckpt_name": "v1-5-pruned-emaonly.safetensors"},
    },
    NODE_ID_LATENT: {
        "class_type": "EmptyLatentImage",
        "inputs": {"batch_size": 1, "height": 1024, "width": 1024},
    },
    NODE_ID_POSITIVE_PROMPT: {
        "class_type": "CLIPTextEncode",
        "inputs": {"clip": [NODE_ID_CHECKPOINT, 1], "text": ""},
    },
    NODE_ID_NEGATIVE_PROMPT: {
        "class_type": "CLIPTextEncode",
        "inputs": {"clip": [NODE_ID_CHECKPOINT, 1], "text": ""},
    },
    "8": {
        "class_type": "VAEDecode",
        "inputs": {"samples": [NODE_ID_SAMPLER, 0], "vae": [NODE_ID_CHECKPOINT, 2]},
    },
    "9": {
        "class_type": "SaveImage",
        "inputs": {"filename_prefix": "gameart", "images": ["8", 0]},
    },
}


class ComfyUIError(Exception):
    """Raised when ComfyUI reports an execution error."""


class ComfyUIConnectionError(Exception):
    """Raised when we cannot reach the ComfyUI server."""


class ComfyUIService:
    def __init__(self):
        self.api_url = settings.COMFYUI_API_URL
        self.client_id = str(uuid.uuid4())

    async def generate(
        self,
        prompt: str,
        negative_prompt: str = "",
        width: int = 1024,
        height: int = 1024,
        num_images: int = 1,
        workflow_json: dict | None = None,
        checkpoint: str | None = None,
        **kwargs,
    ) -> list[dict]:
        workflow = json.loads(json.dumps(workflow_json or DEFAULT_WORKFLOW))

        self._inject_params(workflow, prompt, negative_prompt, width, height, num_images)

        if checkpoint:
            self._set_checkpoint(workflow, checkpoint)

        self._apply_sampler_overrides(workflow, kwargs)

        start = time.time()
        prompt_id = await self._queue_prompt(workflow)
        logger.info(f"ComfyUI prompt queued: {prompt_id}")

        images = await self._poll_for_completion(prompt_id)
        elapsed = time.time() - start

        sampler_node = workflow.get(NODE_ID_SAMPLER, {}).get("inputs", {})
        results = []
        for img_info in images:
            qs = urlencode({
                "filename": img_info["filename"],
                "subfolder": img_info.get("subfolder", ""),
                "type": img_info.get("type", "output"),
            })
            results.append({
                "image_url": f"{self.api_url}/view?{qs}",
                "generation_time_seconds": round(elapsed / max(len(images), 1), 2),
                "provider": GenerationProvider.COMFYUI_LOCAL,
                "params": {
                    "prompt_id": prompt_id,
                    "filename": img_info["filename"],
                    "width": width,
                    "height": height,
                    "steps": sampler_node.get("steps"),
                    "cfg": sampler_node.get("cfg"),
                },
            })

        return results

    def _inject_params(
        self,
        workflow: dict,
        prompt: str,
        negative_prompt: str,
        width: int,
        height: int,
        num_images: int,
    ):
        pos_node = self._find_node(workflow, "CLIPTextEncode", NODE_ID_POSITIVE_PROMPT)
        neg_node = self._find_node(workflow, "CLIPTextEncode", NODE_ID_NEGATIVE_PROMPT, offset=1)
        latent_node = self._find_node(workflow, "EmptyLatentImage", NODE_ID_LATENT)

        if pos_node:
            pos_node["inputs"]["text"] = prompt
        if neg_node:
            neg_node["inputs"]["text"] = negative_prompt
        if latent_node:
            latent_node["inputs"]["width"] = width
            latent_node["inputs"]["height"] = height
            latent_node["inputs"]["batch_size"] = num_images

    @staticmethod
    def _find_node(workflow: dict, class_type: str, preferred_id: str, offset: int = 0) -> dict | None:
        if preferred_id in workflow and workflow[preferred_id].get("class_type") == class_type:
            return workflow[preferred_id]
        matches = [n for n in workflow.values() if n.get("class_type") == class_type]
        if offset < len(matches):
            return matches[offset]
        return matches[0] if matches else None

    @staticmethod
    def _set_checkpoint(workflow: dict, ckpt_name: str):
        for node in workflow.values():
            if node.get("class_type") == "CheckpointLoaderSimple":
                node["inputs"]["ckpt_name"] = ckpt_name
                return

    @staticmethod
    def _apply_sampler_overrides(workflow: dict, kwargs: dict):
        for node in workflow.values():
            if node.get("class_type") == "KSampler":
                inputs = node["inputs"]
                if "seed" in kwargs:
                    inputs["seed"] = kwargs["seed"]
                if "steps" in kwargs:
                    inputs["steps"] = kwargs["steps"]
                if "cfg" in kwargs:
                    inputs["cfg"] = kwargs["cfg"]
                return

    async def _queue_prompt(self, workflow: dict) -> str:
        try:
            async with httpx.AsyncClient(timeout=30) as client:
                response = await client.post(
                    f"{self.api_url}/prompt",
                    json={
                        "prompt": workflow,
                        "client_id": self.client_id,
                    },
                )
                if response.status_code == 400:
                    error_detail = response.json() if response.headers.get("content-type", "").startswith("application/json") else response.text
                    raise ComfyUIError(f"ComfyUI rejected the workflow: {error_detail}")
                response.raise_for_status()
                data = response.json()
                if "prompt_id" not in data:
                    raise ComfyUIError(f"ComfyUI response missing prompt_id: {data}")
                return data["prompt_id"]
        except httpx.ConnectError as e:
            raise ComfyUIConnectionError(
                f"Cannot connect to ComfyUI at {self.api_url}. "
                f"Ensure ComfyUI is running and accessible. Error: {e}"
            ) from e
        except httpx.TimeoutException as e:
            raise ComfyUIConnectionError(
                f"Connection to ComfyUI at {self.api_url} timed out: {e}"
            ) from e

    async def _poll_for_completion(
        self,
        prompt_id: str,
        timeout: int = 600,
        interval: int = 2,
    ) -> list[dict]:
        deadline = time.time() + timeout
        consecutive_errors = 0
        max_consecutive_errors = 5

        async with httpx.AsyncClient(timeout=30) as client:
            while time.time() < deadline:
                try:
                    resp = await client.get(f"{self.api_url}/history/{prompt_id}")

                    if resp.status_code == 200:
                        consecutive_errors = 0
                        history = resp.json()

                        if prompt_id in history:
                            entry = history[prompt_id]

                            status = entry.get("status", {})
                            if status.get("status_str") == "error":
                                messages = status.get("messages", [])
                                raise ComfyUIError(
                                    f"ComfyUI execution error for {prompt_id}: {messages}"
                                )

                            outputs = entry.get("outputs", {})
                            images = []
                            for node_output in outputs.values():
                                if "images" in node_output:
                                    images.extend(node_output["images"])
                            if images:
                                return images

                except (httpx.ConnectError, httpx.TimeoutException) as e:
                    consecutive_errors += 1
                    logger.warning(
                        f"ComfyUI poll error ({consecutive_errors}/{max_consecutive_errors}): {e}"
                    )
                    if consecutive_errors >= max_consecutive_errors:
                        raise ComfyUIConnectionError(
                            f"Lost connection to ComfyUI during generation: {e}"
                        ) from e

                await asyncio.sleep(interval)

        raise TimeoutError(f"ComfyUI generation timed out after {timeout}s for prompt {prompt_id}")

    async def get_system_stats(self) -> dict:
        try:
            async with httpx.AsyncClient(timeout=10) as client:
                resp = await client.get(f"{self.api_url}/system_stats")
                resp.raise_for_status()
                return resp.json()
        except (httpx.ConnectError, httpx.TimeoutException) as e:
            raise ComfyUIConnectionError(f"Cannot reach ComfyUI: {e}") from e

    async def get_queue_status(self) -> dict:
        try:
            async with httpx.AsyncClient(timeout=10) as client:
                resp = await client.get(f"{self.api_url}/queue")
                resp.raise_for_status()
                return resp.json()
        except (httpx.ConnectError, httpx.TimeoutException) as e:
            raise ComfyUIConnectionError(f"Cannot reach ComfyUI: {e}") from e

    async def upload_image(self, image_data: bytes, filename: str) -> dict:
        try:
            async with httpx.AsyncClient(timeout=30) as client:
                resp = await client.post(
                    f"{self.api_url}/upload/image",
                    files={"image": (filename, image_data, "image/png")},
                )
                resp.raise_for_status()
                return resp.json()
        except (httpx.ConnectError, httpx.TimeoutException) as e:
            raise ComfyUIConnectionError(f"Cannot reach ComfyUI for upload: {e}") from e

    async def fetch_image(self, filename: str, subfolder: str = "", img_type: str = "output") -> bytes:
        """Proxy-fetch an image from ComfyUI for serving to the browser."""
        qs = urlencode({"filename": filename, "subfolder": subfolder, "type": img_type})
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.get(f"{self.api_url}/view?{qs}")
            resp.raise_for_status()
            return resp.content


comfyui_service = ComfyUIService()
