# 固定 bookworm，避免 python:3.12-slim 默认切到 trixie 时 deb 源 404/断连（国内构建常见）
FROM python:3.12-slim-bookworm

WORKDIR /app

ENV PIP_DISABLE_PIP_VERSION_CHECK=1

# asyncpg 等有 wheel，无需 apt 装 gcc/libpq-dev，减少 apt 失败概率
COPY requirements.txt .
RUN pip install --no-cache-dir --prefer-binary -r requirements.txt

COPY . .

RUN mkdir -p uploads outputs

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
