#!/usr/bin/env python3
"""Refresh data/makerworld.json from MakerWorld's public design API.

MakerWorld puts Cloudflare in front of the profile page and every list
endpoint, so there is no way to ask "what has this user published?" from a
script. The single-design endpoint is open, though, so the model IDs live
here and the stats come down live. Publishing a new model? Add its ID to
MODEL_IDS below — the top three are then picked automatically by downloads.
"""

import json, pathlib, subprocess, sys
from datetime import datetime, timezone

HANDLE    = "1LawRam"
PROFILE   = f"https://makerworld.com/en/@{HANDLE}"
API       = "https://makerworld.com/api/v1/design-service/design/{}"
FEATURED  = 3
OUT       = pathlib.Path(__file__).resolve().parent.parent / "data" / "makerworld.json"

MODEL_IDS = [
    1987538,  # Disney Cruise Ornament Exchange - All Versions*
    1042028,  # Low Food Bowl For Pets
    1034778,  # Simple Clorox Toilet Wand Holder
    2117425,  # iPhone 17 Pro - Style Notepad Holder
    1996359,  # Standby Mode Dock Watch Add-On
    2209821,  # SF 25-26 HX711 Container
    1977611,  # Magnetic Door Holder
    2135175,  # SF 25-26 Drone Battery Case Offical
    2135159,  # Science Fair 25-26 Drone Frame & Lid Offical
]

# a cover at full size is ~2 MB; ask the CDN for a display-sized webp instead
COVER_RESIZE = "?x-oss-process=image%2Fresize%2Cw_800%2Fformat%2Cwebp"


def fetch(design_id):
    """Shell out to curl: the system python on macOS ships without a CA bundle,
    and this has to run on Lawrence's laptop as well as on a CI runner."""
    out = subprocess.run(
        ["curl", "-sS", "--fail", "--max-time", "30",
         "-H", "accept: application/json",
         "-A", "lawrenceleiramirez.com stats refresher",
         API.format(design_id)],
        capture_output=True, text=True, check=True,
    ).stdout
    return json.loads(out)


def tidy(d):
    cover = d.get("coverUrl") or ""
    if cover and "x-oss-process" not in cover:
        cover += COVER_RESIZE
    return {
        "id": d["id"],
        "title": d["title"].strip().rstrip("*").strip(),
        "url": f"https://makerworld.com/en/models/{d['id']}-{d.get('slug', '')}",
        "cover": cover,
        "downloads": d.get("downloadCount", 0),
        "prints": d.get("printCount", 0),
        "likes": d.get("likeCount", 0),
        "collections": d.get("collectionCount", 0),
        "comments": d.get("commentCount", 0),
        "published": (d.get("createTime") or "")[:10],
    }


def main():
    models, failed = [], []
    for mid in MODEL_IDS:
        try:
            models.append(tidy(fetch(mid)))
        except (subprocess.CalledProcessError, KeyError, json.JSONDecodeError) as e:
            failed.append(f"{mid}: {e}")

    if not models:
        print("error: every model lookup failed:\n  " + "\n  ".join(failed), file=sys.stderr)
        return 1
    for f in failed:
        print(f"warning: skipped {f}", file=sys.stderr)

    models.sort(key=lambda m: (m["downloads"], m["prints"], m["likes"]), reverse=True)

    payload = {
        "updated": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "profile": {
            "handle": HANDLE,
            "url": PROFILE,
            "models": len(models),
            "downloads": sum(m["downloads"] for m in models),
            "prints": sum(m["prints"] for m in models),
            "likes": sum(m["likes"] for m in models),
            "collections": sum(m["collections"] for m in models),
        },
        "featured": models[:FEATURED],
    }

    # Keep the file byte-identical when nothing moved, so the daily CI run
    # only produces a commit on a real change rather than a timestamp bump.
    if OUT.exists():
        try:
            old = json.loads(OUT.read_text(encoding="utf-8"))
            if {k: v for k, v in old.items() if k != "updated"} == \
               {k: v for k, v in payload.items() if k != "updated"}:
                print("no change since " + old.get("updated", "?"))
                return 0
        except json.JSONDecodeError:
            pass

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    p = payload["profile"]
    print(f"wrote {OUT.name}: {p['models']} models, {p['downloads']} downloads, "
          f"{p['prints']} prints, {p['likes']} likes")
    for m in payload["featured"]:
        print(f"  featured: {m['title']} ({m['downloads']} dl)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
