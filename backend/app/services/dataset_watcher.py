import os
import sys
import time
import json
import re
import hashlib
import logging
import asyncio
from typing import Dict, Any, List, Optional
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler

from backend.app.config.settings import (
    NVIDIA_API_KEY, NVIDIA_BASE_URL,
    QDRANT_URL, QDRANT_API_KEY, COLLECTION_NAME, EMBEDDING_MODEL
)
from backend.chunker import Chunk

logger = logging.getLogger("lorin_ai.watcher")

class DatasetFileHandler(FileSystemEventHandler):
    """
    Handles file creation, modification, and deletion events in Dataset/ folder.
    Automatically re-chunks, embeds, and live-upserts into Qdrant & BM25 in <3s.
    """
    def __init__(self, dataset_dir: str, sync_callback=None):
        super().__init__()
        self.dataset_dir = os.path.abspath(dataset_dir)
        self.sync_callback = sync_callback
        self.manifest_path = os.path.join(self.dataset_dir, ".manifest.json")
        self.manifest = self._load_manifest()
        self._last_event_time = 0.0

    def _load_manifest(self) -> Dict[str, str]:
        if os.path.exists(self.manifest_path):
            try:
                with open(self.manifest_path, "r", encoding="utf-8") as f:
                    return json.load(f)
            except Exception:
                pass
        return {}

    def _save_manifest(self):
        try:
            with open(self.manifest_path, "w", encoding="utf-8") as f:
                json.dump(self.manifest, f, indent=2)
        except Exception as e:
            logger.warning(f"[Dataset Watcher] Error saving manifest: {e}")

    def _compute_md5(self, file_path: str) -> str:
        try:
            with open(file_path, "rb") as f:
                return hashlib.md5(f.read()).hexdigest()
        except Exception:
            return ""

    def on_modified(self, event):
        if event.is_directory or event.src_path.endswith(".json") or event.src_path.endswith(".tmp"):
            return
        self._handle_file_change(event.src_path, "modified")

    def on_created(self, event):
        if event.is_directory or event.src_path.endswith(".json") or event.src_path.endswith(".tmp"):
            return
        self._handle_file_change(event.src_path, "created")

    def _handle_file_change(self, file_path: str, change_type: str):
        # Debounce rapid file write events (wait 1 sec)
        now = time.time()
        if now - self._last_event_time < 1.0:
            return
        self._last_event_time = now

        if not file_path.endswith((".md", ".txt", ".json")):
            return

        rel_file = os.path.basename(file_path)
        new_hash = self._compute_md5(file_path)
        if not new_hash:
            return

        old_hash = self.manifest.get(rel_file)
        if old_hash == new_hash:
            return  # Content unchanged, skip embedding

        logger.info(f"[Dataset Watcher] Change detected ({change_type}): '{rel_file}' -> Processing live re-indexing...")
        self.manifest[rel_file] = new_hash
        self._save_manifest()

        if self.sync_callback:
            try:
                self.sync_callback(file_path, rel_file)
            except Exception as e:
                logger.error(f"[Dataset Watcher] Sync error for '{rel_file}': {e}")

# Global Observer instance
_watcher_observer: Optional[Observer] = None

def start_dataset_watcher(dataset_dir: str, sync_callback=None) -> Optional[Observer]:
    """
    Starts background file-system watcher monitoring Dataset/ directory.
    """
    global _watcher_observer
    if _watcher_observer is not None:
        return _watcher_observer

    if not os.path.exists(dataset_dir):
        logger.warning(f"[Dataset Watcher] Dataset directory '{dataset_dir}' does not exist.")
        return None

    try:
        handler = DatasetFileHandler(dataset_dir, sync_callback=sync_callback)
        observer = Observer()
        observer.schedule(handler, path=dataset_dir, recursive=False)
        observer.start()
        _watcher_observer = observer
        logger.info(f"[Dataset Watcher] Real-time file watcher active on '{dataset_dir}'!")
        return observer
    except Exception as e:
        logger.warning(f"[Dataset Watcher] Failed to start watcher: {e}")
        return None

def stop_dataset_watcher():
    """Stops the active dataset watcher background thread."""
    global _watcher_observer
    if _watcher_observer:
        try:
            _watcher_observer.stop()
            _watcher_observer.join()
            logger.info("[Dataset Watcher] Stopped background watcher cleanly.")
        except Exception:
            pass
        _watcher_observer = None
