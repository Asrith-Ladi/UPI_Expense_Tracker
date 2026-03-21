"""
PhonePe PDF Statement to Excel Converter Module

Converts PhonePe transaction PDF statements to Excel format
compatible with the Expense Tracker app.
"""
import pdfplumber
import pandas as pd
import re
import io
from datetime import datetime


def extract_text(file) -> str:
    """Extract text from all pages of the PDF."""
    text = ""
    
    with pdfplumber.open(file) as pdf:
        for page in pdf.pages:
            page_text = page.extract_text()
            if page_text:
                text += "\n" + page_text
    
    return text


def convert_to_railway_time(time_str: str) -> str:
    """
    Convert 12-hour time format to 24-hour railway time (HH:MM:SS).
    
    Examples:
        "12:58 pm" -> "12:58:00"
        "03:12 pm" -> "15:12:00"
    """
    if not time_str:
        return ""
    
    time_str = time_str.strip().lower()
    
    try:
        match = re.match(r'(\d{1,2}):(\d{2})\s*(am|pm)', time_str)
        if match:
            hour = int(match.group(1))
            minute = int(match.group(2))
            period = match.group(3)
            
            if period == 'am':
                if hour == 12:
                    hour = 0
            else:  # pm
                if hour != 12:
                    hour += 12
            
            return f"{hour:02d}:{minute:02d}:00"
    except Exception:
        pass
    
    return time_str


def parse_transactions(text: str) -> pd.DataFrame:
    """
    Parse PhonePe statement text and extract transactions.
    
    PhonePe format:
    Jan 18, 2026 Paid to Amrutha Potnuru G DEBIT ₹20
    12:58 pm Transaction ID T2601181258159549607333
    """
    rows = []
    lines = text.split('\n')
    
    i = 0
    while i < len(lines):
        line = lines[i].strip()
        
        # Look for date pattern: "Jan 18, 2026" or "Dec 31, 2025"
        date_match = re.match(r'^([A-Za-z]{3}\s+\d{1,2},\s+\d{4})\s+(.+)', line)
        
        if date_match:
            date_str = date_match.group(1)
            rest_of_line = date_match.group(2)
            
            # Parse the date
            try:
                date_obj = datetime.strptime(date_str, "%b %d, %Y")
                formatted_date = date_obj.strftime("%d/%m/%Y")
            except Exception:
                formatted_date = date_str
            
            # Extract transaction type and amount
            type_amount_match = re.search(r'(DEBIT|CREDIT)\s+(?:Rs\.?|₹)\s*([\d,]+(?:\.\d{1,2})?)', rest_of_line)
            
            trans_type = ""
            amount_value = 0.0
            
            if type_amount_match:
                trans_type = type_amount_match.group(1)
                amount_str = type_amount_match.group(2).replace(",", "")
                try:
                    amount_value = float(amount_str)
                except ValueError:
                    amount_value = 0.0
                
                transaction_details = rest_of_line[:type_amount_match.start()].strip()
            else:
                transaction_details = rest_of_line.strip()
            
            # Make amount negative for DEBIT
            if trans_type == "DEBIT":
                amount_value = -abs(amount_value)
            
            # Look for time and other details in next lines
            time_railway = ""
            transaction_id = ""
            utr_no = ""
            paid_by = ""
            
            for j in range(1, 5):
                if i + j >= len(lines):
                    break
                next_line = lines[i + j].strip()
                
                # Check if we hit the next transaction
                if re.match(r'^[A-Za-z]{3}\s+\d{1,2},\s+\d{4}', next_line):
                    break
                
                # Extract time
                time_match = re.match(r'^(\d{1,2}:\d{2}\s*[ap]m)', next_line, re.IGNORECASE)
                if time_match:
                    time_railway = convert_to_railway_time(time_match.group(1))
                
                # Extract Transaction ID
                tid_match = re.search(r'Transaction\s+ID\s+(\S+)', next_line, re.IGNORECASE)
                if tid_match:
                    transaction_id = tid_match.group(1)
                
                # Extract UTR No.
                utr_match = re.search(r'UTR\s+No\.?\s*(\S+)', next_line, re.IGNORECASE)
                if utr_match:
                    utr_no = utr_match.group(1)
                
                # Extract Paid by / Credited to
                paid_match = re.search(r'(Paid\s+by|Credited\s+to)\s+(\S+)', next_line, re.IGNORECASE)
                if paid_match:
                    paid_by = paid_match.group(2)
            
            # Clean up transaction details
            transaction_details = re.sub(r'\s+', ' ', transaction_details).strip()
            
            # Skip headers and footers
            if transaction_details.lower() in ['date transaction details type amount', 'transaction details', '']:
                i += 1
                continue
            if 'system generated statement' in transaction_details.lower():
                i += 1
                continue
            if 'page' in transaction_details.lower() and 'of' in transaction_details.lower():
                i += 1
                continue
            
            rows.append({
                "Date": formatted_date,
                "Transaction Details": transaction_details,
                "Amount": amount_value,
                "Time": time_railway,
                "Tags": "",
                "Type": trans_type,
                "Transaction ID": transaction_id,
                "UTR No": utr_no,
                "Account": paid_by
            })
        
        i += 1
    
    return pd.DataFrame(rows)


def convert_phonepe_pdf(file) -> io.BytesIO:
    """
    Convert PhonePe PDF to Excel and return as BytesIO.
    
    Args:
        file: File object (BytesIO or file-like object)
        
    Returns:
        BytesIO containing the Excel file
    """
    # Reset file pointer
    file.seek(0)
    
    # Extract text from PDF
    text = extract_text(file)
    
    if not text.strip():
        raise ValueError("No extractable text found in the PhonePe PDF.")
    
    # Parse transactions
    df = parse_transactions(text)
    
    if df.empty:
        raise ValueError("No transactions found in the PhonePe PDF.")
    
    # Clean up
    df = df[df['Transaction Details'].str.len() > 0]
    df = df[~df['Transaction Details'].str.contains('Transaction Details', case=False, na=False)]
    
    # Write to BytesIO as Excel
    output = io.BytesIO()
    df.to_excel(output, index=False, sheet_name='Passbook Payment History', engine='openpyxl')
    output.seek(0)
    
    return output
