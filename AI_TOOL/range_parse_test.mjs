import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";

const script = String.raw`
from app.services.range import parse_range

cases = [
    ("bytes=0-1023", 52877149, (0, 1023)),
    ("bytes=0-", 52877149, (0, 52877148)),
    ("bytes=0-0,-1", 52877149, (0, 0)),
    ("bytes=-1024", 52877149, (52876125, 52877148)),
    ("bad", 52877149, (0, 52877148)),
    ("bytes=a-b", 52877149, (0, 52877148)),
]

for header, size, expected in cases:
    actual = parse_range(header, size)
    if actual != expected:
        raise AssertionError(f"{header}: expected {expected}, got {actual}")
print("range parse ok")
`;

const result = spawnSync("python", ["-c", script], {
  cwd: "server",
  encoding: "utf8"
});

if (result.status !== 0) {
  process.stdout.write(result.stdout);
  process.stderr.write(result.stderr);
  process.exit(result.status ?? 1);
}

assert.match(result.stdout, /range parse ok/);
process.stdout.write(result.stdout);
