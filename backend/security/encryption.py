import os
from cryptography.fernet import Fernet
from dotenv import load_dotenv

load_dotenv()

# Retrieve or generate symmetric encryption key
ENCRYPTION_KEY = os.getenv("ENCRYPTION_KEY")

if not ENCRYPTION_KEY:
    # Fallback to generating a key if one is not configured (for development safety)
    ENCRYPTION_KEY = Fernet.generate_key().decode()

try:
    # Ensure key is valid Fernet key
    _fernet = Fernet(ENCRYPTION_KEY.encode())
except Exception:
    # If the key is not valid, generate a valid key
    ENCRYPTION_KEY = Fernet.generate_key().decode()
    _fernet = Fernet(ENCRYPTION_KEY.encode())

def encrypt_value(value: str) -> str:
    """Symmetrically encrypt a string value."""
    if not value:
        return ""
    return _fernet.encrypt(value.encode()).decode()

def decrypt_value(encrypted_value: str) -> str:
    """Decrypt a symmetrically encrypted string value."""
    if not encrypted_value:
        return ""
    try:
        return _fernet.decrypt(encrypted_value.encode()).decode()
    except Exception as e:
        raise ValueError(f"Decryption failed: {str(e)}")
