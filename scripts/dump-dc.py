from pathlib import Path
t = Path(r"C:\Users\marti\AppData\Local\Temp\mf-extract\template.html").read_text(encoding="utf-8")
start = t.find('<script type="text/x-dc"')
end = t.find("</script>", start)
body = t[start:end]
# the script content starts after >
gt = body.find(">")
script = body[gt + 1 :]
Path(r"C:\Users\marti\AppData\Local\Temp\mf-dc.js").write_text(script, encoding="utf-8")
print(len(script))
