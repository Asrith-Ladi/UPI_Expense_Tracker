"""
Data Processing Module for Personal Finance Dashboard

This module handles the loading, cleaning, and normalization of transaction data
from various sources (Excel, CSV, and converted PDFs). It ensures consistent
column naming and data types (Date, Amount, Credit/Debit) for downstream analysis.
"""

import pandas as pd
import re
import os
import tempfile
import shutil
from datetime import datetime
from utils import setup_logger
from converters import detect_and_convert_pdf

logger = setup_logger('FinanceDashboard.Processor')

def parse_amount(val):
    """
    Robustly parse amount strings like '+$9089', '-₹1,000.00', or 'Rs. 500'.
    Handles symbols between the sign and the number.
    """
    if pd.isna(val) or val == '':
        return 0.0
    
    s = str(val).strip()
    
    # 1. Detect sign (look for - or + at the very beginning)
    sign = 1
    if s.startswith('-'):
        sign = -1
    elif s.startswith('+'):
        sign = 1
        
    # 2. Extract only digits and decimal points
    # This removes $, ₹, Rs, commas, etc.
    numeric_parts = re.findall(r'[0-9.]+', s)
    if not numeric_parts:
        return 0.0
    
    # Join all numeric fragments found (handles commas like 1,000 -> ['1', '000'] -> '1000')
    try:
        num_str = "".join(numeric_parts)
        return sign * float(num_str)
    except (ValueError, IndexError):
        return 0.0

def sanitize_filename(filename):
    """Clean up filename to remove problematic characters."""
    clean = filename.replace("'", "").replace('"', "")
    clean = re.sub(r'[^\w\-._]', '_', clean)
    return clean

def process_uploaded_file(file):
    """Handles PDF conversion if needed and returns a processable file object."""
    orig_filename = getattr(file, 'name', 'uploaded_file')
    
    if orig_filename.lower().endswith('.pdf'):
        logger.info(f"Detected PDF file: {orig_filename}")
        try:
            excel_buffer, platform = detect_and_convert_pdf(file, orig_filename)
            if excel_buffer is not None and platform not in ['', 'unknown']:
                logger.info(f"Successfully converted {platform} PDF to Excel")
                excel_buffer.name = orig_filename.replace('.pdf', '.xlsx')
                return excel_buffer, orig_filename, platform
            elif platform == 'unknown':
                logger.warning(f"⚠️ Could not identify the PDF format for '{orig_filename}'. "
                          "Please ensure the filename contains 'phonepe' or 'gpay'.")
                return None, orig_filename, None
        except Exception as e:
            logger.error(f"Error converting PDF: {e}")
            logger.error(f"❌ Failed to convert PDF '{orig_filename}': {str(e)}")
            return None, orig_filename, None
    
    return file, orig_filename, None

def load_and_process_data(file, tagging_functions):
    """
    Load a single Excel or CSV file and normalize columns.
    tagging_functions should be a dict containing 'extract_tag' and 'extract_main_detail'.
    """
    orig_filename = getattr(file, 'name', 'uploaded_file')
    filename = sanitize_filename(orig_filename)
    logger.info(f"Processing file: {orig_filename}")
    
    df = None
    last_error = None
    
    if orig_filename.lower().endswith(('.xlsx', '.xls')):
        try:
            with tempfile.TemporaryDirectory() as temp_dir:
                temp_file = os.path.join(temp_dir, filename)
                with open(temp_file, 'wb') as f:
                    file.seek(0)
                    shutil.copyfileobj(file, f)
                
                try:
                    df = pd.read_excel(temp_file, sheet_name='Passbook Payment History', engine='openpyxl')
                except ValueError:
                    df = pd.read_excel(temp_file, engine='openpyxl')
        except Exception as e:
            last_error = e
            df = None
    
    if df is None:
        encodings = ['utf-8', 'latin1', 'iso-8859-1', 'cp1252']
        for encoding in encodings:
            try:
                file.seek(0)
                df = pd.read_csv(file, encoding=encoding)
                last_error = None
                break
            except Exception as e:
                last_error = e
                continue
    
    if df is None:
        raise ValueError(f"Could not read {orig_filename}. Error: {last_error}")

    df.columns = [c.strip() for c in df.columns]

    # Date processing
    if 'Date' in df.columns:
        df['Date'] = pd.to_datetime(df['Date'], dayfirst=True, errors='coerce')
    elif 'Date & Time' in df.columns:
        df['Date'] = pd.to_datetime(df['Date & Time'], dayfirst=True, errors='coerce')

    # Time processing
    if 'Time' in df.columns:
        df['Time'] = pd.to_datetime(df['Time'].astype(str), format='%H:%M:%S', errors='coerce').dt.time
    elif 'Date & Time' in df.columns:
        df['Time'] = pd.to_datetime(df['Date & Time'], dayfirst=True, errors='coerce').dt.time

    # Amount processing
    amount_col = None
    for candidate in ['Amount', 'Amount ', 'Your Account Amount', 'Amount (INR)']:
        if candidate in df.columns:
            amount_col = candidate
            break
    
    if amount_col is not None:
        try:
            logger.info(f"Processing amounts from column: {amount_col}")
            # Use the robust parse_amount function
            df['Amount'] = df[amount_col].apply(parse_amount)
            logger.info(f"Successfully processed {len(df[df['Amount'] != 0])} amount values")
        except Exception as e:
            logger.error(f"Error processing amounts: {e}")
            df['Amount'] = 0.0
    else:
        logger.warning("No amount column found, setting Amount to 0.0")
        df['Amount'] = 0.0

    # Date extras
    # Date extras (coerce to stable types to avoid downstream type issues)
    df['Month'] = df['Date'].dt.month_name().astype('string').fillna('')
    df['Year'] = pd.to_numeric(df['Date'].dt.year, errors='coerce').astype('Int64')
    df['DayOfWeek'] = df['Date'].dt.day_name().astype('string').fillna('')
    
    # Hour should be integer; coerce robustly from Time or Date
    if 'Time' in df.columns and df['Time'].notna().any():
        hour_series = pd.to_datetime(df['Time'].astype(str), format='%H:%M:%S', errors='coerce').dt.hour
    else:
        hour_series = df['Date'].dt.hour

    # Coerce any non-numeric hour values safely to 0 and convert to int
    df['Hour'] = pd.to_numeric(hour_series, errors='coerce').fillna(0).astype(int)

    # Tagging
    extract_tag = tagging_functions['extract_tag']
    extract_main_detail = tagging_functions['extract_main_detail']

    if 'Tags' in df.columns:
        # Ensure Tags column is string dtype to avoid FutureWarning on mixed dtype assignment
        df['Tags'] = df['Tags'].astype(object)
        blank_mask = df['Tags'].isna() | (df['Tags'].astype(str).str.strip() == '')
        if 'Transaction Details' in df.columns:
            df.loc[blank_mask, 'Tags'] = df.loc[blank_mask, 'Transaction Details'].apply(extract_tag)
        else:
            df.loc[blank_mask, 'Tags'] = 'Others'
    else:
        if 'Transaction Details' in df.columns:
            df['Tags'] = df['Transaction Details'].apply(extract_tag)
        else:
            df['Tags'] = 'Others'

    if 'Main Detail' not in df.columns:
        if 'Transaction Details' in df.columns:
            df['Main Detail'] = df['Transaction Details'].apply(extract_main_detail)
        else:
            df['Main Detail'] = ''

    # Create Credit and Debit columns for filtering
    df['Credit'] = df['Amount'].apply(lambda x: x if x > 0 else 0.0)
    df['Debit'] = df['Amount'].apply(lambda x: -x if x < 0 else 0.0)

    return df
