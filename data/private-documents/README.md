# Private document storage

This directory holds **private-by-default** uploaded documents for the local /
hybrid API (`DOCUMENT_STORAGE_ROOT`).

- Do not commit real PHI or production files.
- Development and test must use `demoFixture` uploads only (see `SECURITY_DOCUMENTS.md`).
- Subfolders `_trash`, `_quarantine`, `_logs` are created at runtime.
