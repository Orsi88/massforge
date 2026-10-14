from pathlib import Path

lines = Path(r"C:\Users\marti\AppData\Local\Temp\mf-outline.txt").read_text(encoding="utf-8").splitlines()
keys = ("isStdGen", "isGenericCat", "isFilesCat", "isComposer", "isCombined", "isHome", "hasCrumbs", "kFiles", "kText", "kCode")
for i, line in enumerate(lines):
    if any(k in line for k in keys):
        start = max(0, i - 2)
        end = min(len(lines), i + 80)
        print(f"\n===== {i} {line} =====")
        print("\n".join(f"{n}: {lines[n]}" for n in range(start, end)))
