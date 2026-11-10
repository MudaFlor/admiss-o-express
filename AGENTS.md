# Architecture rules
- Candidate registration dates use a dedicated DATE column and shared calendar validation; default to the São Paulo day and filter inclusive date bounds without changing creation timestamps.
- HR candidate registration warnings share an authenticated HR-only lookup and pure advisory matching; never use warning matches to merge or block records automatically.
- Employee deletion uses one shared confirmation control and an authenticated admin-only server action; preserve source candidate files and record the deletion in audit.
- Candidate submission validation lives in a shared pure module used by the portal and server, so required contact data and CTPS cannot diverge between them.
- Preserve document OCR and evidence unchanged; store candidate-reviewed document values separately in form_data.documentos_revisados to distinguish extraction from declarations.
- All candidate-facing correction and invitation links use the shared public-url helper so editor origins never reach candidates.
- Document uniqueness applies only to active single-file holder types; course, vaccination and dependent types permit multiple rows to match the upload handler.
- Dashboard and management pipeline counts use the shared pure status counter so all candidate statuses are initialized and totals remain consistent.
- Employee creation/import and registration edits validate through the shared employee-ID rules; a database trigger and normalized unique index enforce registration even for concurrent or direct writes while preserving legacy records.