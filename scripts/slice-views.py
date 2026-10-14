from pathlib import Path
t = Path(r"C:\Users\marti\AppData\Local\Temp\mf-extract\template.html").read_text(encoding="utf-8")
for name in ("isCardVisual", "isIdVisual", "vMulti", "isComposer", "kText", "kCode"):
    i = t.find(name)
    print(name, i)
Path(r"C:\Users\marti\AppData\Local\Temp\mf-views.txt").write_text(
    "\n\n===== CARD =====\n" + t[t.find("isCardVisual"):t.find("isCardVisual")+4500]
    + "\n\n===== ID =====\n" + t[t.find("isIdVisual"):t.find("isIdVisual")+3500]
    + "\n\n===== MULTI =====\n" + t[t.find("vMulti"):t.find("vMulti")+4000],
    encoding="utf-8",
)
