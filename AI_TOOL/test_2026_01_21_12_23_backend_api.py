import argparse
import json
import os
import subprocess
import sys
import tempfile
import time
from pathlib import Path
from typing import Tuple


def write_step(message: str) -> None:
    print(f"[STEP] {message}")


def write_ok(message: str) -> None:
    print(f"[OK] {message}")


def write_fail(message: str) -> None:
    print(f"[FAIL] {message}")


def find_curl() -> str:
    for name in ("curl.exe", "curl"):
        path = shutil_which(name)
        if path:
            return path
    return ""


def shutil_which(name: str) -> str:
    from shutil import which

    return which(name) or ""


def run_curl(curl_path: str, args: list) -> Tuple[int, str, str]:
    with tempfile.NamedTemporaryFile(delete=False) as temp:
        temp_path = temp.name
    try:
        cmd = [curl_path] + args + ["-s", "-o", temp_path, "-w", "%{http_code}"]
        result = subprocess.run(cmd, capture_output=True, text=True)
        status_text = (result.stdout or "").strip()
        body = ""
        if os.path.exists(temp_path):
            try:
                body = Path(temp_path).read_text(encoding="utf-8")
            except UnicodeDecodeError:
                body = Path(temp_path).read_text(encoding="utf-8", errors="replace")
        status = int(status_text) if status_text.isdigit() else 0
        return status, body, result.stderr
    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)


def assert_status(name: str, expected: int, status: int, body: str, failed: list) -> bool:
    if status != expected:
        write_fail(f"{name} 状态码期望 {expected}，实际 {status}。Body: {body}")
        failed.append(True)
        return False
    write_ok(name)
    return True


def assert_json_field(name: str, body: str, field: str, expected: str, failed: list) -> bool:
    try:
        data = json.loads(body) if body else {}
    except json.JSONDecodeError:
        write_fail(f"{name} JSON 解析失败。Body: {body}")
        failed.append(True)
        return False
    actual = data.get(field)
    if actual != expected:
        write_fail(f"{name} 字段 {field} 期望 {expected}，实际 {actual}")
        failed.append(True)
        return False
    return True


def pick_video(tv_data_dir: Path) -> Path:
    for path in tv_data_dir.rglob("*.mp4"):
        if path.is_file():
            return path
    return Path()


def wait_health(curl_path: str, base_url: str, retries: int = 20) -> int:
    for _ in range(retries):
        status, _, _ = run_curl(curl_path, [f"{base_url}/health"])
        if status == 200:
            return status
        time.sleep(0.5)
    return status


def main() -> int:
    parser = argparse.ArgumentParser(description="后端接口测试脚本")
    parser.add_argument("--base-url", default="http://127.0.0.1:8000")
    parser.add_argument("--token", default="dev-token")
    parser.add_argument("--auto-start", action="store_true")
    args = parser.parse_args()

    root = Path(__file__).resolve().parent.parent
    backend_dir = root / "backend"
    tv_data_dir = root / "tv_data"

    if not backend_dir.exists():
        write_fail(f"backend 目录不存在：{backend_dir}")
        return 1
    if not tv_data_dir.exists():
        write_fail(f"tv_data 目录不存在：{tv_data_dir}")
        return 1

    video = pick_video(tv_data_dir)
    if not video:
        write_fail(f"未找到 mp4 文件：{tv_data_dir}")
        return 1

    curl_path = find_curl()
    if not curl_path:
        write_fail("未找到 curl，可先安装或确保 curl.exe 在 PATH 中")
        return 1

    failed = []
    proc = None
    try:
        health_status, health_body, _ = run_curl(curl_path, [f"{args.base_url}/health"])
        if health_status != 200 and args.auto_start:
            write_step("尝试自动启动后端服务")
            proc = subprocess.Popen(
                [sys.executable, "-m", "uvicorn", "app.main:app", "--host", "127.0.0.1", "--port", "8000"],
                cwd=str(backend_dir),
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL
            )
            health_status = wait_health(curl_path, args.base_url)
            health_body = ""
        if not assert_status("健康检查 /health", 200, health_status, health_body, failed):
            return 1

        status, body, _ = run_curl(curl_path, [f"{args.base_url}/admin/ping"])
        write_step(f"管理端鉴权（无 Token）返回状态 {status}")
        assert_status("管理端鉴权（无 Token）", 401, status, body, failed)

        status, body, _ = run_curl(curl_path, ["-H", f"Authorization: Bearer {args.token}", f"{args.base_url}/admin/ping"])
        assert_status("管理端鉴权（有 Token）", 200, status, body, failed)

        status, body, _ = run_curl(
            curl_path,
            [
                "-X", "POST",
                "-H", f"Authorization: Bearer {args.token}",
                "-F", f"file=@{video};type=video/mp4",
                f"{args.base_url}/admin/videos"
            ]
        )
        if assert_status("上传视频 /admin/videos", 200, status, body, failed):
            assert_json_field("上传视频 /admin/videos", body, "type", "video", failed)

        status, body, _ = run_curl(
            curl_path,
            [
                "-X", "POST",
                "-H", f"Authorization: Bearer {args.token}",
                "-F", "title=demo",
                "-F", "content=# hello",
                f"{args.base_url}/admin/articles"
            ]
        )
        if assert_status("导入图文 /admin/articles", 200, status, body, failed):
            assert_json_field("导入图文 /admin/articles", body, "type", "article", failed)

        status, body, _ = run_curl(
            curl_path,
            [
                "-X", "DELETE",
                "-H", f"Authorization: Bearer {args.token}",
                f"{args.base_url}/admin/items/999"
            ]
        )
        if assert_status("删除不存在内容 /admin/items/999", 404, status, body, failed):
            assert_json_field("删除不存在内容 /admin/items/999", body, "detail", "not found", failed)

        status, body, _ = run_curl(curl_path, [f"{args.base_url}/items"])
        assert_status("客户端列表 /items", 200, status, body, failed)

        status, body, _ = run_curl(curl_path, [f"{args.base_url}/files/1/stream"])
        if assert_status("流式读取 /files/1/stream", 404, status, body, failed):
            assert_json_field("流式读取 /files/1/stream", body, "detail", "not found", failed)
    finally:
        if proc is not None:
            proc.terminate()
            try:
                proc.wait(timeout=3)
            except subprocess.TimeoutExpired:
                proc.kill()

    if failed:
        write_fail("测试未通过")
        return 1
    write_ok("测试全部通过")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
