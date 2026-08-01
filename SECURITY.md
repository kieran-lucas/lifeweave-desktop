# Security Policy

## Reporting

For a private repository, report security/privacy/data-integrity issues directly to the Product Owner and create a private draft fix branch. Do not place personal content, secrets, exploit payloads, or full paths in a public issue.

## Highest-severity categories
- data loss or corruption;
- restore/migration failure;
- path traversal or unsafe import;
- command/shell execution;
- overly broad Tauri capability;
- secret/signing material exposure;
- personal content in logs/CI/artifacts;
- hidden application network request.

## Response rule

Stop writes or release when data integrity is uncertain. Preserve evidence, create a safe backup, reproduce with synthetic fixtures, and do not “repair” by deleting user data.
