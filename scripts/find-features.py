from pathlib import Path
t = Path(r"C:\Users\marti\AppData\Local\Temp\mf-extract\template.html").read_text(encoding="utf-8")
needles = [
    "scenarios", "shortcuts", "Pessoa jurídica", "Comece por", "steps",
    "onClearSel", "avanc", "Avançad", "Revis", "dirCustom", "isCfgTab",
]
for n in needles:
    i = t.find(n)
    print(n, i)
print("--- script tags ---")
idx = 0
while True:
    j = t.find("<script", idx)
    if j < 0:
        break
    print(j, t[j:j+120].replace("\n", " "))
    idx = j + 7
