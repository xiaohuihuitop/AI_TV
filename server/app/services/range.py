from pathlib import Path
from typing import Tuple


def parse_range(range_header: str, file_size: int) -> Tuple[int, int]:
    """AI: 解析 Range 头。
    @param range_header: Range 字符串。
    @param file_size: 文件大小。
    @return: (start, end)
    """
    if file_size <= 0:
        return 0, 0
    unit, rng = StringRange(range_header).split_once("=")
    if unit.lower().strip() != "bytes":
        return 0, file_size - 1
    first_range = rng.split(",", 1)[0].strip()
    start_s, end_s = StringRange(first_range).split_once("-")
    if not start_s and not end_s:
        return 0, file_size - 1
    if not start_s:
        suffix = parse_positive_int(end_s, file_size)
        start = max(file_size - suffix, 0)
        end = file_size - 1
        return start, end
    start = parse_positive_int(start_s, 0)
    end = parse_positive_int(end_s, file_size - 1) if end_s else file_size - 1
    if end >= file_size:
        end = file_size - 1
    if start > end:
        return 0, file_size - 1
    return start, end


class StringRange:
    def __init__(self, value: str):
        self.value = str(value or "")

    def split_once(self, separator: str) -> Tuple[str, str]:
        if separator not in self.value:
            return "", ""
        left, right = self.value.split(separator, 1)
        return left.strip(), right.strip()


def parse_positive_int(value: str, fallback: int) -> int:
    try:
        parsed = int(str(value or "").strip())
    except ValueError:
        return fallback
    return max(parsed, 0)


def iter_file(path: Path, start: int, end: int, chunk_size: int = 8192):
    """AI: 读取文件分片流。
    @param path: 文件路径。
    @param start: 起始偏移。
    @param end: 结束偏移。
    @param chunk_size: 块大小。
    @return: 字节迭代器。
    """
    with path.open("rb") as f:
        f.seek(start)
        remaining = end - start + 1
        while remaining > 0:
            read_size = min(chunk_size, remaining)
            data = f.read(read_size)
            if not data:
                break
            remaining -= len(data)
            yield data
