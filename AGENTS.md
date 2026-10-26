# Architecture rules
- Candidate submission validation lives in a shared pure module used by the portal and server, so required contact data and CTPS cannot diverge between them.
- Preserve document OCR and evidence unchanged; store candidate-reviewed document values separately in form_data.documentos_revisados to distinguish extraction from declarations.
- All candidate-facing correction and invitation links use the shared public-url helper so editor origins never reach candidates.
- Document uniqueness applies only to active single-file holder types; course, vaccination and dependent types permit multiple rows to match the upload handler.