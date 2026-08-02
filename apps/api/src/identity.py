import re
from contextvars import ContextVar

from fastapi import HTTPException, status

_DEVICE_ID: ContextVar[str] = ContextVar("brain_rot_device_id", default="local-extension-device")
_DEVICE_PATTERN = re.compile(r"^[A-Za-z0-9][A-Za-z0-9._-]{7,127}$")


def validate_device_id(value: str | None) -> str:
    device_id = (value or "local-extension-device").strip()
    if not _DEVICE_PATTERN.fullmatch(device_id):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,
                            detail="X-Device-ID must be 8-128 characters: letters, numbers, '.', '_' or '-'.")
    return device_id


def set_device_id(value: str) -> None:
    _DEVICE_ID.set(validate_device_id(value))


def get_device_id() -> str:
    return _DEVICE_ID.get()
