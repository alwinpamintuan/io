"""Compare deterministic IO screenshots. Pillow is a QA dependency, not shipped.

Capture the manifest's states at the listed CSS sizes and place identically named
PNGs in the candidate directory. Testers must be idle; monitor uses grid mode.
Changing numeric annotation text is excluded using each case's mask rectangle.
Usage: python scripts/compare_visuals.py artifacts/release/local/current
"""
import argparse
import json
from pathlib import Path
from PIL import Image, ImageChops, ImageDraw, ImageStat


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("candidate", type=Path)
    parser.add_argument("--manifest", type=Path, default=Path("artifacts/release/local/visual-manifest.json"))
    args = parser.parse_args()
    manifest = json.loads(args.manifest.read_text(encoding="utf-8"))
    baseline = args.manifest.parent / "baseline"
    failures = []
    for case in manifest["cases"]:
        name = case["file"]
        candidate = args.candidate / name
        if not candidate.exists():
            failures.append(f"{name}: missing candidate")
            continue
        if not (baseline / name).exists():
            failures.append(f"{name}: missing accepted baseline")
            continue
        reference = Image.open(baseline / name).convert("RGB")
        actual = Image.open(candidate).convert("RGB")
        if reference.size != tuple(case["viewport"]) or actual.size != reference.size:
            failures.append(f"{name}: wrong dimensions {actual.size}")
            continue
        for rect in case.get("masks", []):
            ImageDraw.Draw(reference).rectangle(rect, fill="white")
            ImageDraw.Draw(actual).rectangle(rect, fill="white")
        diff = ImageChops.difference(reference, actual)
        mean = sum(ImageStat.Stat(diff).mean) / (3 * 255)
        pixels = diff.get_flattened_data() if hasattr(diff, "get_flattened_data") else diff.getdata()
        changed = sum(1 for pixel in pixels if max(pixel) > 24) / (reference.width * reference.height)
        passed = mean <= manifest["maximum_mean_error"] and changed <= manifest["maximum_changed_fraction"]
        print(f"{'PASS' if passed else 'FAIL'} {name}: mean={mean:.5f} changed={changed:.3%}")
        if not passed:
            failures.append(name)
            diff.save(args.candidate / f"diff-{name}")
    if failures:
        raise SystemExit("Visual checks failed: " + "; ".join(failures))


if __name__ == "__main__":
    main()
