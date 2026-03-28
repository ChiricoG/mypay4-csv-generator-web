# SPDX-License-Identifier: EUPL-1.2
from typing import Any

VALIDATION_ERRORS = {
    "MP-001": "IUD non valido o mancante (max 35 car, no prefix 000).",
    "MP-002": "Codice Fiscale pagatore non valido (fisico: 16 car alfanum).",
    "MP-003": "Codice Fiscale pagatore non valido (giuridico: 11 cifre).",
    "MP-004": "Importo non valido (usa il punto per i decimali, es: 100.00).",
    "MP-005": "DatiSpecificiRiscossione non validi (formato tipo/codice).",
    "MP-006": "Data non valida (formato atteso: YYYY-MM-DD).",
    "MP-007": "Causale mancante o troppo lunga (max 1024 car).",
    "MP-008": "IBAN non valido.",
    "MP-009": "Campo obbligatorio mancante.",
    "MP-010": "tipoIdentificativoUnivoco deve essere F o G.",
    "MP-011": "Dati ente secondario incompleti o errati.",
    "MP-012": "La somma degli accertamenti nel bilancio non coincide con l'importoDovuto.",
}

FIELDS: list[Any] = [
    ("IUD", "IUD", True, "text", "Identificativo Unico Dovuto (1-35 car).\nI primi 3 caratteri devono essere diversi da '000'.\nCodice errore: MP-001"),
    ("codIuv", "Codice IUV", False, "text", "Codice Univoco Versamento (1-35 car).\nFormato IUV 17 generato da ente.\nObbligatorio se si generano avvisi pagoPA."),
    ("tipoIdentificativoUnivoco", "Tipo Identificativo Univoco", True, "combo_FG", "F = Persona Fisica\nG = Persona Giuridica\nCodice errore: MP-010"),
    ("codiceIdentificativoUnivoco", "Codice Identificativo Univoco", True, "text", "Codice fiscale se F (MP-002), Partita IVA se G (MP-003).\nOppure 'ANONIMO' se configurato nel BackOffice."),
    ("anagraficaPagatore", "Anagrafica Pagatore", True, "text", "Nominativo o ragione sociale del pagatore (1-70 car)."),
    ("indirizzoPagatore", "Indirizzo Pagatore", False, "text", "Indirizzo del pagatore (1-70 car)."),
    ("civicoPagatore", "Civico Pagatore", False, "text", "Numero civico (1-16 car)."),
    ("capPagatore", "CAP Pagatore", False, "text", "CAP del pagatore (1-16 car)."),
    ("localitaPagatore", "Localita' Pagatore", False, "text", "Localita' del pagatore (1-35 car)."),
    ("provinciaPagatore", "Provincia Pagatore", False, "text", "Provincia (2 car. - codifica ISTAT a due lettere)."),
    ("nazionePagatore", "Nazione Pagatore", False, "text", "Nazione (2 car. - ISO 3166-1-alpha-2)."),
    ("mailPagatore", "E-mail Pagatore", False, "text", "Indirizzo e-mail del pagatore (1-256 car)."),
    ("dataEsecuzionePagamento", "Data Esecuzione Pagamento", True, "date", "Data scadenza formato ISO 8601: YYYY-MM-DD.\nObbligatorieta' condizionata al flag flg_scadenza_obbligatoria del tipoDovuto.\nCodice errore: MP-006"),
    ("importoDovuto", "Importo Dovuto", True, "decimal", "Importo dovuto (es. 100.50).\nSeparatore centesimi: punto '.'. Deve essere > 0.00.\nCodice errore: MP-004"),
    ("commissioneCaricoPa", "Commissione Carico PA", False, "decimal", "Commissione a carico dell'ente (es. 1.50).\nSolo indicativo, diverso da 0.00 se specificato.\nCodice errore: MP-004"),
    ("tipoDovuto", "Tipo Dovuto", True, "text", "Codice tipologia dovuto secondo classificazione ente (1-64 car).\nCodice errore: MP-009"),
    ("tipoVersamento", "Tipo Versamento", False, "text", "Forma tecnica di pagamento. Valore di default consigliato: ALL."),
    ("causaleVersamento", "Causale Versamento", True, "text", "Descrizione estesa della causale (1-1024 car).\nCodice errore: MP-007"),
    ("datiSpecificiRiscossione", "Dati Specifici Riscossione", True, "dsr", "Nodo SPC: [0129]{1}/\\S{3,138}.\nDigitare tipo/codice oppure usare l'Helper.\nCodice errore: MP-005"),
    ("bilancio", "Bilancio (XML)", False, "bilancio_xml", "Struttura XML opzionale per rendicontazione contabile (max 4096 car).\nUsare l'Editor dedicato.\nCodice errore: MP-012"),
    ("flgGeneraIuv", "Flag Genera IUV", False, "combo_bool", "Se true, MyPay genera lo IUV automaticamente."),
    ("flagMultiBeneficiario", "Flag Multi Beneficiario", False, "combo_bool", "Impostare a 'true' per attivare ente secondario.\nCodice errore: MP-011"),
    ("codiceFiscaleEnteSecondario", "CF Ente Secondario", False, "text", "P.IVA o CF dell'ente secondario."),
    ("denominazioneEnteSecondario", "Denominazione Ente Secondario", False, "text", "Ragione sociale dell'ente secondario (1-70 car)."),
    ("ibanAccreditoEnteSecondario", "IBAN Accredito Ente Secondario", False, "text", "IBAN di accredito dell'ente secondario (ISO 13616).\nCodice errore: MP-008"),
    ("indirizzoEnteSecondario", "Indirizzo Ente Secondario", False, "text", "Indirizzo ente secondario."),
    ("civicoEnteSecondario", "Civico Ente Secondario", False, "text", "Civico ente secondario."),
    ("capEnteSecondario", "CAP Ente Secondario", False, "text", "CAP ente secondario (1-16 car)."),
    ("localitaEnteSecondario", "Localita' Ente Secondario", False, "text", "Localita' ente secondario."),
    ("provinciaEnteSecondario", "Provincia Ente Secondario", False, "text", "Provincia ente secondario (2 car)."),
    ("nazioneEnteSecondario", "Nazione Ente Secondario", False, "text", "Nazione ente secondario (2 car. ISO)."),
    ("datiSpecificiRiscossioneEnteSecondario", "Dati Spec. Riscossione Ente Sec.", False, "dsr", "DSR per ente secondario (1-140 car)."),
    ("causaleVersamentoEnteSecondario", "Causale Versamento Ente Sec.", False, "text", "Causale specifica per l'ente secondario (1-1024 car)."),
    ("importoVersamentoEnteSecondario", "Importo Versamento Ente Sec.", False, "decimal", "Quota spettante all'ente secondario.\nAttenzione: deve essere <= importoDovuto."),
    ("azione", "Azione", True, "combo_IMA", "I = Inserimento (standard)\nM = Modifica\nA = Annullamento"),
]

HEADER = [f[0] for f in FIELDS]
FIELD_MAP = {f[0]: f for f in FIELDS}
SECTIONS = [
    ("Dati Pagatore", HEADER[0:12]),
    ("Dati Dovuto", HEADER[12:21]),
    ("Ente Secondario (1_4)", HEADER[21:34]),
    ("Azione", HEADER[34:35]),
]

DSR_TYPES = [
    ("0", "0 — Capitolo e articolo di Entrata del Bilancio dello Stato"),
    ("1", "1 — Numero della contabilita' speciale"),
    ("2", "2 — Codice SIOPE"),
    ("9", "9 — Altro codice ad uso dell'amministrazione"),
]
