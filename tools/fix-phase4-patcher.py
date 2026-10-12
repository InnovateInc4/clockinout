from pathlib import Path

path = Path('tools/apply-phase4-complete.py')
text = path.read_text(encoding='utf-8')

old = "clock = replace_once(clock, gps_marker, offline_banner + gps_marker, 'offline status banner')"
new = """if gps_marker not in clock:
    raise SystemExit('offline status banner: GPS marker not found')
clock = clock.replace(gps_marker, offline_banner + gps_marker, 1)"""

if old in text:
    text = text.replace(old, new, 1)
elif new not in text:
    raise SystemExit('Could not find the GPS banner patcher statement to fix.')

path.write_text(text, encoding='utf-8')
print('Guarded patcher updated to use the first GPS marker only.')
