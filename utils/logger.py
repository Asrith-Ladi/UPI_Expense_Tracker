'''
Logging configuration utility for Personal Finance Dashboard application.
Cloud-compatible: works on both local and Streamlit Cloud.
'''
import logging
import os
import sys
from datetime import datetime
from pathlib import Path
import streamlit as st


def is_streamlit_cloud() -> bool:
    """Check if running on Streamlit Cloud."""
    return (
        os.environ.get('STREAMLIT_SHARING_MODE') is not None or
        os.environ.get('STREAMLIT_SERVER_ADDRESS') is not None or
        os.path.exists('/mount/src')
    )


def setup_logger(name: str = 'FinanceDashboard', log_dir: Path = None) -> logging.Logger:
    """
    Set up and configure a logger with both file and console handlers.
    Ensures that the logger is configured only once per Streamlit session.
    """
    if 'logger_initialized' in st.session_state and st.session_state.logger_initialized:
        return logging.getLogger(name)

    if log_dir is None:
        if is_streamlit_cloud():
            log_dir = Path('/tmp/logs')
        else:
            log_dir = Path(__file__).parent.parent / 'logs'
    
    try:
        log_dir.mkdir(parents=True, exist_ok=True)
    except PermissionError:
        log_dir = Path('/tmp/logs')
        log_dir.mkdir(parents=True, exist_ok=True)
    
    log_file = log_dir / f'finance_dashboard_{datetime.now().strftime("%Y%m%d_%H%M%S")}.log'
    
    handlers = [
        logging.StreamHandler(sys.stdout)
    ]
    
    try:
        handlers.append(logging.FileHandler(log_file))
    except (PermissionError, OSError):
        pass
    
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        handlers=handlers,
        force=True
    )
    
    logger = logging.getLogger(name)
    logger.info(f"Logger initialized. Log directory: {log_dir}")
    
    st.session_state.logger_initialized = True
    
    return logger


def get_logger(name: str = 'FinanceDashboard') -> logging.Logger:
    """Get an existing logger by name."""
    return logging.getLogger(name)
