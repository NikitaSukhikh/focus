# Files agent stub for search and file operations.

from .base import BaseAgent


class FilesAgent(BaseAgent):
    def _get_system_prompt(self) -> str:
        return (
            "You are the Files agent. You help with file-related queries. "
            "If a request requires file system access, acknowledge limitations and keep replies concise."
        )
