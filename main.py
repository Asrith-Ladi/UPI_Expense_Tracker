import os
import json
import urllib.error
import urllib.request
from pathlib import Path
from typing import List, Dict, Any, Optional

from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parent / ".env")
from pydantic import BaseModel
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import pandas as pd
from core.processor import process_uploaded_file, load_and_process_data
from core.tagging import extract_tag, extract_main_detail, apply_custom_tags
from utils import setup_logger
import uvicorn

# Configure logging
logger = setup_logger('FinanceDashboard.API')

app = FastAPI(title="Personal Finance Dashboard API")

# Add CORS middleware to allow the React frontend to communicate with the backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Adjust this in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

TAGS_FILE = "tags.json"

def load_custom_tags() -> Dict[str, str]:
    if os.path.exists(TAGS_FILE):
        try:
            with open(TAGS_FILE, 'r') as f:
                return json.load(f)
        except Exception as e:
            logger.error(f"Error reading tags file: {e}")
            return {}
    return {}

def save_custom_tags(tags: Dict[str, str]):
    try:
        with open(TAGS_FILE, 'w') as f:
            json.dump(tags, f, indent=4)
    except Exception as e:
        logger.error(f"Error saving tags file: {e}")

@app.get("/api/tags")
def get_tags():
    """Retrieve all custom tags"""
    return load_custom_tags()

@app.post("/api/tags")
def update_tags(tags: dict):
    """Update custom tags"""
    save_custom_tags(tags)
    return {"message": "Tags updated successfully"}

@app.post("/api/process")
async def process_statements(files: List[UploadFile] = File(...)):
    """
    Process uploaded statement files and return the combined cleaned data as JSON.
    """
    if not files:
        raise HTTPException(status_code=400, detail="No files provided")

    dfs = []
    custom_tags = load_custom_tags()
    
    class FileWrapper:
        def __init__(self, file_content, filename):
            self._file = file_content
            self.name = filename
        def read(self, size=-1): return self._file.read(size)
        def seek(self, offset, whence=0): return self._file.seek(offset, whence)
        def tell(self): return self._file.tell()

    for file in files:
        try:
            # Create a file-like object with a name attribute
            file_wrapper = FileWrapper(file.file, file.filename)
            
            processed_file, filename, platform = process_uploaded_file(file_wrapper)

            
            if processed_file:
                # Load data with extracted tagging functions
                df = load_and_process_data(
                    processed_file, 
                    tagging_functions={'extract_tag': extract_tag, 'extract_main_detail': extract_main_detail}
                )
                if df is not None and not df.empty:
                    dfs.append(df)
        except Exception as e:
            logger.error(f"Failed to process {file.filename}: {e}")
            raise HTTPException(status_code=500, detail=f"Failed to read {file.filename}: {str(e)}")

    if not dfs:
        raise HTTPException(status_code=400, detail="No valid data loaded from the files.")

    combined_df = pd.concat(dfs, ignore_index=True)

    # Apply Custom Tags to the base dataset
    combined_df = apply_custom_tags(combined_df, custom_tags)

    # Convert datetime columns to string (ISO format) for JSON serialization
    if 'Date' in combined_df.columns:
        combined_df['Date'] = combined_df['Date'].dt.strftime('%Y-%m-%d')
    if 'Time' in combined_df.columns:
        combined_df['Time'] = combined_df['Time'].astype(str)
        
    # Replace NaN/Infinity with None for JSON compliance
    combined_df = combined_df.where(pd.notnull(combined_df), None)

    # Return as list of dictionaries
    records = combined_df.to_dict(orient='records')
    return {"data": records}


def telegram_send_message(token: str, chat_id: str, text: str) -> dict:
    """POST sendMessage to Telegram Bot API (max 4096 chars)."""
    url = f"https://api.telegram.org/bot{token}/sendMessage"
    payload = json.dumps(
        {"chat_id": chat_id, "text": text[:4096]},
        ensure_ascii=False,
    ).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=payload,
        headers={"Content-Type": "application/json; charset=utf-8"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            return json.loads(resp.read().decode())
    except urllib.error.HTTPError as e:
        err_body = e.read().decode() if e.fp else str(e)
        raise ValueError(f"Telegram API error {e.code}: {err_body}") from e


class TelegramRegister(BaseModel):
    """User opts in; Telegram bots use chat_id (not phone) to deliver messages."""
    chat_id: str  # numeric string, e.g. "123456789"
    phone: Optional[str] = None  # optional display / your records
    enabled: bool = False
    message_preview: Optional[str] = None


@app.post("/api/telegram/register")
def telegram_register(body: TelegramRegister):
    """
    Stores opt-in and sends one test message via Telegram Bot API when enabled.
    Requires TELEGRAM_BOT_TOKEN in environment (.env) and a valid chat_id.
    """
    token = (os.environ.get("TELEGRAM_BOT_TOKEN") or "").strip()
    chat_id = (body.chat_id or "").strip()

    logger.info(
        "Telegram register: chat_id=%s phone=%s enabled=%s token_set=%s",
        chat_id,
        body.phone,
        body.enabled,
        bool(token),
    )

    if not token:
        raise HTTPException(
            status_code=503,
            detail="Server missing TELEGRAM_BOT_TOKEN. Copy .env.example to .env and set your bot token.",
        )

    telegram_sent = False
    send_error: Optional[str] = None

    if body.enabled:
        if not chat_id:
            raise HTTPException(
                status_code=400,
                detail="chat_id is required. Open Telegram, message your bot, then get your chat id from getUpdates.",
            )
        text = (body.message_preview or "").strip() or "UPI Analysis tracker: alerts enabled."
        try:
            telegram_send_message(token, chat_id, text)
            telegram_sent = True
        except Exception as e:
            send_error = str(e)
            logger.warning("Telegram send failed: %s", send_error)

    return {
        "ok": True,
        "telegram_sent": telegram_sent,
        "send_error": send_error,
        "detail": "Chat ID identifies your Telegram user; the bot can only message users who have started the bot.",
    }


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
