import os
import json
from typing import List, Dict, Any, Optional
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


class WhatsAppRegister(BaseModel):
    """Stub payload for future WhatsApp Business / Twilio integration."""
    phone: Optional[str] = None
    enabled: bool = False
    message_preview: Optional[str] = None


@app.post("/api/whatsapp/register")
def whatsapp_register(body: WhatsAppRegister):
    """
    Accepts user phone + opt-in for WhatsApp alerts (credit/debit text).
    Does not send WhatsApp messages — connect Meta Cloud API or Twilio here.
    """
    logger.info(
        "WhatsApp register stub: phone=%s enabled=%s preview_chars=%s",
        body.phone,
        body.enabled,
        len(body.message_preview or ""),
    )
    return {
        "ok": True,
        "status": "stub",
        "detail": "Attach WhatsApp Cloud API or Twilio WhatsApp; templates must be approved by Meta.",
    }


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
