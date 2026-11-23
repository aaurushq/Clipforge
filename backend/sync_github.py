import os
import sys
import base64
import requests
from pathlib import Path

GITHUB_TOKEN = os.getenv("GITHUB_TOKEN")
if not GITHUB_TOKEN and len(sys.argv) > 1:
    GITHUB_TOKEN = sys.argv[1]

if not GITHUB_TOKEN:
    sys.exit(0)

REPO_OWNER = "aaurushq"
REPO_NAME = "Clipforge"
BRANCH = "main"

BASE_DIR = Path(__file__).resolve().parent.parent

EXCLUDE_DIRS = {
    "node_modules", ".next", ".venv", "data", "__pycache__", ".git", "scratch"
}

EXCLUDE_FILES = {
    ".env", ".env.local"
}

EXCLUDE_EXTS = {
    ".pyc", ".log"
}

headers = {
    "Authorization": f"Bearer {GITHUB_TOKEN}",
    "Accept": "application/vnd.github+json",
    "User-Agent": "ClipForge-Uploader"
}

def collect_files():
    files_to_push = []
    for root, dirs, files in os.walk(BASE_DIR):
        dirs[:] = [d for d in dirs if d not in EXCLUDE_DIRS]
        
        for file in files:
            if file in EXCLUDE_FILES or file == "sync_github.py":
                continue
            ext = Path(file).suffix.lower()
            if ext in EXCLUDE_EXTS:
                continue
            
            full_path = Path(root) / file
            rel_path = full_path.relative_to(BASE_DIR).as_posix()
            
            parts = rel_path.split("/")
            if any(p in EXCLUDE_DIRS for p in parts[:-1]):
                continue
            
            files_to_push.append((full_path, rel_path))
    return files_to_push

def main():
    ref_res = requests.get(f"https://api.github.com/repos/{REPO_OWNER}/{REPO_NAME}/git/ref/heads/{BRANCH}", headers=headers)
    if ref_res.status_code != 200:
        return
    
    parent_commit_sha = ref_res.json()["object"]["sha"]
    files = collect_files()
    
    tree_items = []
    for full_path, rel_path in files:
        with open(full_path, "rb") as f:
            content_bytes = f.read()
        
        b64_content = base64.b64encode(content_bytes).decode("utf-8")
        blob_res = requests.post(
            f"https://api.github.com/repos/{REPO_OWNER}/{REPO_NAME}/git/blobs",
            headers=headers,
            json={"content": b64_content, "encoding": "base64"}
        )
        if blob_res.status_code == 201:
            tree_items.append({
                "path": rel_path,
                "mode": "100644",
                "type": "blob",
                "sha": blob_res.json()["sha"]
            })

    tree_res = requests.post(
        f"https://api.github.com/repos/{REPO_OWNER}/{REPO_NAME}/git/trees",
        headers=headers,
        json={"tree": tree_items}
    )
    if tree_res.status_code != 201:
        return
    tree_sha = tree_res.json()["sha"]

    commit_res = requests.post(
        f"https://api.github.com/repos/{REPO_OWNER}/{REPO_NAME}/git/commits",
        headers=headers,
        json={
            "message": "feat: Add Hinglish captions for Hindi videos, dynamic zooms, bottom progress bar & hook transitions",
            "tree": tree_sha,
            "parents": [parent_commit_sha]
        }
    )
    if commit_res.status_code != 201:
        return
    commit_sha = commit_res.json()["sha"]

    requests.patch(
        f"https://api.github.com/repos/{REPO_OWNER}/{REPO_NAME}/git/refs/heads/{BRANCH}",
        headers=headers,
        json={"sha": commit_sha, "force": True}
    )
    print("GitHub synced successfully!")

if __name__ == "__main__":
    main()
