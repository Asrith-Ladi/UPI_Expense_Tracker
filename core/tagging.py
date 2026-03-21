"""
Tagging and Categorization Module for Personal Finance Dashboard

This module contains the logic for extracting short descriptions (Main Detail)
and categories (Tags) from raw transaction details. It also handles the 
application of user-defined custom tags.
"""

import pandas as pd
from utils import setup_logger

logger = setup_logger('FinanceDashboard.Tagging')

def extract_tag(detail):
    """Extracts a default category based on keywords in the transaction detail."""
    if isinstance(detail, str):
        s = detail.strip().lower()
        if s.startswith('money sent to'):
            return 'Personal Money Transfer'
        elif s.startswith('paid to'):
            return 'Merchant Transfer'
        elif s.startswith('received from'):
            return 'Received Money'
        elif s.startswith('payment to'):
            return 'Merchant Transfer'
        else:
            return 'Others'
    return 'Others'

def extract_main_detail(detail):
    """Extracts the recipient or sender name from the transaction detail."""
    if isinstance(detail, str):
        s = detail.strip()
        prefixes = ['money sent to', 'paid to', 'received from', 'payment to']
        for prefix in prefixes:
            if s.lower().startswith(prefix):
                return s[len(prefix):].strip()
        return s
    return ''

def apply_custom_tags(df, custom_tags):
    """
    Applies user-defined custom tags to a DataFrame based on the 'Main Detail' column.
    """
    if custom_tags:
        logger.info(f"Applying {len(custom_tags)} custom tags")
        mask = df['Main Detail'].isin(custom_tags.keys())
        df.loc[mask, 'Tags'] = df.loc[mask, 'Main Detail'].map(custom_tags)
    return df
