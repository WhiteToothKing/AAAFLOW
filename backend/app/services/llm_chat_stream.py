"""Streaming chat completions: Anthropic Messages vs OpenAI Chat Completions."""
from __future__ import annotations

import logging
from typing import AsyncGenerator

from anthropic import AsyncAnthropic
from openai import AsyncOpenAI

logger = logging.getLogger(__name__)


async def stream_anthropic(
    client: AsyncAnthropic,
    model: str,
    system: str,
    messages: list[dict],
) -> AsyncGenerator[str, None]:
    async with client.messages.stream(
        model=model,
        max_tokens=4096,
        system=system,
        messages=messages,
    ) as stream:
        async for text in stream.text_stream:
            yield text


async def stream_openai(
    client: AsyncOpenAI,
    model: str,
    system: str,
    messages: list[dict],
) -> AsyncGenerator[str, None]:
    full = [{"role": "system", "content": system}, *messages]
    stream = await client.chat.completions.create(
        model=model,
        messages=full,
        max_tokens=4096,
        stream=True,
    )
    async for chunk in stream:
        choice = chunk.choices[0] if chunk.choices else None
        if choice and choice.delta and choice.delta.content:
            yield choice.delta.content
