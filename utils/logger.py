'''
Logging configuration utility for Personal Finance Dashboard application.
'''
import logging
import os
import sys
from datetime import datetime
from pathlib import Path

_initialized_loggers: set = set()


def setup_logger(name: str = 'FinanceDashboard', log_dir: Path = None) -> logging.Logger:
    """
    Set up and configure a logger with both file and console handlers.
    Ensures that the logger is configured only once per process.
    """
    if name in _initialized_loggers:
        return logging.getLogger(name)

    if log_dir is None:
        log_dir = Path(__file__).parent.parent / 'logs'

    try:
        log_dir.mkdir(parents=True, exist_ok=True)
    except (PermissionError, OSError):
        log_dir = Path('/tmp/logs')
        log_dir.mkdir(parents=True, exist_ok=True)

    log_file = log_dir / f'finance_dashboard_{datetime.now().strftime("%Y%m%d_%H%M%S")}.log'

    logger = logging.getLogger(name)
    logger.setLevel(logging.INFO)

    if not logger.handlers:
        fmt = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')

        console_handler = logging.StreamHandler(sys.stdout)
        console_handler.setFormatter(fmt)
        logger.addHandler(console_handler)

        try:
            file_handler = logging.FileHandler(log_file)
            file_handler.setFormatter(fmt)
            logger.addHandler(file_handler)
        except (PermissionError, OSError):
            pass

    logger.info(f"Logger initialized. Log directory: {log_dir}")
    _initialized_loggers.add(name)

    return logger


def get_logger(name: str = 'FinanceDashboard') -> logging.Logger:
    """Get an existing logger by name."""
    return logging.getLogger(name)
