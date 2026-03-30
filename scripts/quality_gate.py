#!/usr/bin/env python3
"""AAAFLOW quality gate — run during CI to catch structural issues early."""
import os
import sys
import py_compile
import json

REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
errors = []
passed = []

def check(name, condition, detail=""):
    if condition:
        passed.append(name)
        print(f"  PASS  {name}")
    else:
        errors.append(name)
        print(f"  FAIL  {name}  {detail}")

print("=== AAAFLOW Quality Gate ===\n")

# 1. Python syntax check
print("[Python syntax]")
backend_app = os.path.join(REPO_ROOT, "backend", "app")
py_errors = 0
py_total = 0
for root, dirs, files in os.walk(backend_app):
    for f in files:
        if f.endswith(".py"):
            py_total += 1
            filepath = os.path.join(root, f)
            try:
                py_compile.compile(filepath, doraise=True)
            except py_compile.PyCompileError as e:
                py_errors += 1
                print(f"    SYNTAX ERROR: {filepath}: {e}")
check("python_syntax", py_errors == 0, f"{py_errors}/{py_total} files have errors")

# 2. Required backend modules
print("\n[Required modules]")
required_modules = [
    "backend/app/core/security.py",
    "backend/app/api/auth.py",
    "backend/app/services/image_generator.py",
    "backend/app/services/skill_registry.py",
    "backend/app/services/claude_analyzer.py",
    "backend/app/services/routing_service.py",
    "backend/app/services/comfyui_service.py",
    "backend/app/services/chat_service.py",
    "backend/app/services/agent_orchestrator.py",
    "backend/app/main.py",
]
for mod in required_modules:
    path = os.path.join(REPO_ROOT, mod)
    check(f"exists:{mod}", os.path.isfile(path), "missing")

# 3. Requirements
print("\n[Dependencies]")
req_path = os.path.join(REPO_ROOT, "backend", "requirements.txt")
check("backend/requirements.txt", os.path.isfile(req_path) and os.path.getsize(req_path) > 0)

pkg_path = os.path.join(REPO_ROOT, "frontend", "package.json")
check("frontend/package.json", os.path.isfile(pkg_path) and os.path.getsize(pkg_path) > 0)

# 4. Frontend TypeScript types must include new providers
print("\n[Frontend types]")
types_path = os.path.join(REPO_ROOT, "frontend", "src", "types", "index.ts")
if os.path.isfile(types_path):
    content = open(types_path).read()
    check("types:jimeng", "JIMENG" in content, "missing JIMENG provider")
    check("types:minimax", "MINIMAX" in content, "missing MINIMAX provider")
else:
    check("types:index.ts", False, "file missing")

# 5. Alembic migrations
print("\n[Migrations]")
migrations_dir = os.path.join(REPO_ROOT, "backend", "alembic", "versions")
check("alembic_versions", os.path.isdir(migrations_dir) and len(os.listdir(migrations_dir)) >= 3, "need at least 3 migrations")

# Summary
print(f"\n=== Summary: {len(passed)} passed, {len(errors)} failed ===")
sys.exit(1 if errors else 0)
