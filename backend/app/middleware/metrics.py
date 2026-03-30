"""
Lightweight request metrics middleware.
Tracks request count, latency histogram, and error rate.
Exposes a /api/metrics endpoint (Prometheus text format).
"""
from __future__ import annotations

import time
import logging
from collections import defaultdict
from typing import Dict

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response, PlainTextResponse

logger = logging.getLogger(__name__)


class _Metrics:
    def __init__(self):
        self.request_count: Dict[str, int] = defaultdict(int)
        self.error_count: Dict[str, int] = defaultdict(int)
        self.latency_sum: Dict[str, float] = defaultdict(float)
        self.latency_count: Dict[str, int] = defaultdict(int)
        self.start_time = time.monotonic()

    def record(self, method: str, path: str, status: int, duration: float):
        key = f"{method} {path}"
        self.request_count[key] += 1
        self.latency_sum[key] += duration
        self.latency_count[key] += 1
        if status >= 500:
            self.error_count[key] += 1

    def to_prometheus(self) -> str:
        lines = [
            "# HELP aaaflow_uptime_seconds Seconds since server start",
            "# TYPE aaaflow_uptime_seconds gauge",
            f"aaaflow_uptime_seconds {time.monotonic() - self.start_time:.1f}",
            "",
            "# HELP aaaflow_requests_total Total HTTP requests",
            "# TYPE aaaflow_requests_total counter",
        ]
        for key, count in sorted(self.request_count.items()):
            method, path = key.split(" ", 1)
            lines.append(f'aaaflow_requests_total{{method="{method}",path="{path}"}} {count}')

        lines.extend([
            "",
            "# HELP aaaflow_errors_total Total 5xx errors",
            "# TYPE aaaflow_errors_total counter",
        ])
        for key, count in sorted(self.error_count.items()):
            method, path = key.split(" ", 1)
            lines.append(f'aaaflow_errors_total{{method="{method}",path="{path}"}} {count}')

        lines.extend([
            "",
            "# HELP aaaflow_latency_seconds_sum Sum of request durations",
            "# TYPE aaaflow_latency_seconds_sum counter",
        ])
        for key, total in sorted(self.latency_sum.items()):
            method, path = key.split(" ", 1)
            lines.append(f'aaaflow_latency_seconds_sum{{method="{method}",path="{path}"}} {total:.4f}')

        return "\n".join(lines) + "\n"


metrics = _Metrics()


def _normalize_path(path: str) -> str:
    """Collapse UUIDs / IDs in URL paths for metric aggregation."""
    import re
    path = re.sub(
        r'/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}',
        '/{id}',
        path,
    )
    path = re.sub(r'/\d+', '/{id}', path)
    return path


class MetricsMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next) -> Response:
        if request.url.path == "/api/metrics":
            return PlainTextResponse(metrics.to_prometheus(), media_type="text/plain; version=0.0.4")

        start = time.monotonic()
        response = await call_next(request)
        duration = time.monotonic() - start

        path = _normalize_path(request.url.path)
        metrics.record(request.method, path, response.status_code, duration)

        if duration > 5.0:
            logger.warning("Slow request: %s %s took %.2fs", request.method, request.url.path, duration)

        return response
