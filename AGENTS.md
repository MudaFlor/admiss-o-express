# Architecture rules
- Candidate submission validation lives in a shared pure module used by the portal and server, so required contact data and CTPS cannot diverge between them.
- Preserve document OCR and evidence unchanged; store candidate-reviewed document values separately in form_data.documentos_revisados to distinguish extraction from declarations.