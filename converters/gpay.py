"""
GPay PDF Statement to Excel Converter Module

Converts GPay transaction PDF statements to Excel format
compatible with the Expense Tracker app.
"""
import pdfplumber
import pandas as pd
import re
import io
from datetime import datetime


def extract_text(file) -> str:
    """Extract text with better spacing using word positions."""
    text = ""
    
    with pdfplumber.open(file) as pdf:
        for i, page in enumerate(pdf.pages):
            words = page.extract_words(x_tolerance=1, y_tolerance=3)
            if not words:
                continue

            # sort by y (top-down) then x (left-right)
            words_sorted = sorted(words, key=lambda w: (round(w['top']), w['x0']))

            lines = []
            current_y = None
            current_line = []

            for w in words_sorted:
                y = round(w['top'])
                if current_y is None:
                    current_y = y
                # if next word is far below → new line
                if abs(y - current_y) > 5:
                    lines.append(" ".join(current_line))
                    current_line = [w['text']]
                    current_y = y
                else:
                    current_line.append(w['text'])

            # add last line
            if current_line:
                lines.append(" ".join(current_line))

            page_text = "\n".join(lines)
            text += "\n" + page_text

    return text


def convert_to_railway_time(time_str: str) -> str:
    """
    Convert 12-hour time format to 24-hour railway time (HH:MM:SS).
    
    Examples:
        "01:01 AM" -> "01:01:00"
        "12:30 PM" -> "12:30:00"
        "11:45PM" -> "23:45:00"
    """
    if not time_str:
        return ""
    
    # Clean up the time string
    time_str = time_str.strip().upper()
    time_str = re.sub(r'\s+', '', time_str)  # Remove all spaces
    
    # Parse 12-hour format and convert to 24-hour
    try:
        match = re.match(r'(\d{1,2}):(\d{2})(AM|PM)', time_str)
        if match:
            hour = int(match.group(1))
            minute = int(match.group(2))
            period = match.group(3)
            
            # Convert to 24-hour format
            if period == 'AM':
                if hour == 12:
                    hour = 0
            else:  # PM
                if hour != 12:
                    hour += 12
            
            return f"{hour:02d}:{minute:02d}:00"
    except Exception:
        pass
    
    return time_str


def parse_transactions(text: str) -> pd.DataFrame:
    """Parse GPay statement text and extract transactions."""
    rows = []

    # Clean up spacing
    text = re.sub(r"\s+", " ", text)

    # Find all transactions based on date pattern
    pattern = re.compile(
        r"(?P<date>\d{1,2}\s?[A-Za-z]{3},\s?\d{4})(?P<details>.*?)(?=(\d{1,2}\s?[A-Za-z]{3},\s?\d{4})|$)",
        re.S
    )

    for m in pattern.finditer(text):
        date_str = m.group("date").strip()
        details_block = m.group("details").strip()

        # Convert date like "24 Oct, 2025" → "24/10/2025"
        try:
            date_obj = datetime.strptime(date_str.replace(",", ""), "%d %b %Y")
            formatted_date = date_obj.strftime("%d/%m/%Y")
        except Exception:
            formatted_date = date_str

        # Extract UPI Transaction ID
        upi_match = re.search(r"UPI\s*Transaction\s*ID[:\s]*([0-9]+)", details_block, re.IGNORECASE)
        upi_id = upi_match.group(1) if upi_match else ""

        # Extract "Paid by ..." (Debited From)
        debited_from_match = re.search(r"(Paid\s+by\s+[A-Za-z\s0-9]+)", details_block, re.IGNORECASE)
        debited_from = debited_from_match.group(1).strip() if debited_from_match else ""

        # Extract amount (₹) and remove rupee symbol
        amount_match = re.search(r"₹([\d,]+(?:\.\d{1,2})?)", details_block)
        amount_value = 0.0
        if amount_match:
            amount_str = amount_match.group(1).replace(",", "")
            try:
                amount_value = float(amount_str)
            except ValueError:
                amount_value = 0.0

        # Extract time
        time_match = re.search(r"(\d{1,2}:\d{2}\s?[APap][Mm])", details_block)
        time_12hr = ""
        if time_match:
            time_12hr = time_match.group(1).replace('.', ':').replace(' ', '').upper()
            time_12hr = re.sub(r'([AP])M$', r' \1M', time_12hr)
        
        time_railway = convert_to_railway_time(time_12hr)

        # Extract transaction details
        transaction_details = details_block
        if amount_match:
            transaction_details = transaction_details.split("₹" + amount_match.group(1))[0]
        elif time_match:
            transaction_details = transaction_details.split(time_match.group(1))[0]

        transaction_details = transaction_details.strip()
        transaction_details = re.sub(r"\s+", " ", transaction_details)

        # Check if "to" exists in transaction details (debit transaction)
        if re.search(r'\bto\b', transaction_details, re.IGNORECASE):
            amount_value = -abs(amount_value)

        rows.append({
            "Date": formatted_date,
            "Transaction Details": transaction_details,
            "Amount": amount_value,
            "Time": time_railway,
            "Tags": "",
            "UPI Transaction ID": upi_id,
            "Debited From": debited_from
        })

    return pd.DataFrame(rows)


def convert_gpay_pdf(file) -> io.BytesIO:
    """
    Convert GPay PDF to Excel and return as BytesIO.
    
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
        raise ValueError("No extractable text found in the GPay PDF.")
    
    # Parse transactions
    df = parse_transactions(text)
    
    if df.empty:
        raise ValueError("No transactions found in the GPay PDF.")
    
    # Write to BytesIO as Excel
    output = io.BytesIO()
    df.to_excel(output, index=False, sheet_name='Passbook Payment History', engine='openpyxl')
    output.seek(0)
    
    return output
