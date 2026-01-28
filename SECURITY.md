# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |
| < 1.0   | :x:                |

## Reporting a Vulnerability

Use this project for educational purposes only. If you discover a security vulnerability, please do **not** create a public issue immediately.

1.  **Email**: Contact the maintainer at `2020sumoy@gmail.com`
2.  **Description**: Provide a detailed description of the vulnerability and steps to reproduce.
3.  **Action**: We will review the issue and release a patch if necessary.

## Security Measures

### Credentials

- **Limited Credentials**: This project may use API credentials during development or when running an optional backend proxy to avoid upstream rate limits.
- **No Hardcoded Secrets**: All credentials are stored in environment variables (`.env`) and are never committed to the repository.
- **Git Protection**: `.env` and any credential files are included in `.gitignore` to prevent accidental exposure.
- **Client Safety**: The client-side code does not contain private secrets. Any credential usage is isolated to local development or server-side components.

### Dependencies

- We use `dotenv` (when applicable) to manage environment variables safely.
- Developers are encouraged to keep dependencies up to date to reduce exposure to known vulnerabilities.
