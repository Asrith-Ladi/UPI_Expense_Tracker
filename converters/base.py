"""
Base converter module with auto-detection logic.
"""
import io
from typing import Optional, Tuple


def detect_platform(filename: str) -> Optional[str]:
    """
    Detect the payment platform from filename.
    
    Args:
        filename: Name of the uploaded file
        
    Returns:
        Platform name ('phonepe', 'gpay') or None if not detected
    """
    filename_lower = filename.lower()
    
    if 'phonepe' in filename_lower:
        return 'phonepe'
    elif 'gpay' in filename_lower or 'google' in filename_lower:
        return 'gpay'
    
    return None


def detect_and_convert_pdf(file, filename: str) -> Tuple[Optional[io.BytesIO], str]:
    """
    Detect the platform and convert PDF to Excel.
    
    Args:
        file: File object (BytesIO or similar)
        filename: Original filename
        
    Returns:
        Tuple of (Excel file as BytesIO, platform name) or (None, '') if not a PDF
    """
    # Check if it's a PDF
    if not filename.lower().endswith('.pdf'):
        return None, ''
    
    platform = detect_platform(filename)
    
    if platform == 'phonepe':
        from .phonepe import convert_phonepe_pdf
        excel_buffer = convert_phonepe_pdf(file)
        return excel_buffer, 'PhonePe'
    
    elif platform == 'gpay':
        from .gpay import convert_gpay_pdf
        excel_buffer = convert_gpay_pdf(file)
        return excel_buffer, 'GPay'
    
    # Unknown PDF format
    return None, 'unknown'
