from pathlib import Path
from typing import Tuple


def parse_range(range_header: str, file_size: int) -> Tuple[int, int]:
    """AI: 解析 Range 头。
    @param range_header: Range 字符串。
    @param file_size: 文件大小。
    @return: (start, end)
    """
    _, rng = range_header.split("=")
    start_s, end_s = rng.split("-")
    start = int(start_s) if start_s else 0
    end = int(end_s) if end_s else file_size - 1
    if end >= file_size:
        end = file_size - 1
    return start, end


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