# SPDX-License-Identifier: EUPL-1.2
import re
from datetime import datetime
from .constants import VALIDATION_ERRORS, FIELDS
from .helpers import to_float
from .xml_engine import parse_bilancio_xml

_DSR_RE = re.compile(r"^[0129]{1}/\S{3,138}$")
_IBAN_RE = re.compile(r"^[a-zA-Z]{2}[0-9]{2}[a-zA-Z0-9]{1,30}$")


def validate_iud(iud: str) -> tuple[bool, str]:
    if not iud or len(iud) > 35 or iud.startswith("000"):
        return False, f"[MP-001] {VALIDATION_ERRORS['MP-001']}"
    return True, ""


def validate_importo(importo: str) -> tuple[bool, str]:
    if "," in str(importo):
        return False, f"[MP-004] {VALIDATION_ERRORS['MP-004']}"
    val = to_float(importo, silent=True)
    if val is None or val <= 0:
        return False, f"[MP-004] {VALIDATION_ERRORS['MP-004']}"
    return True, ""


def validate_dsr(dsr: str) -> tuple[bool, str]:
    if not dsr or not _DSR_RE.match(dsr):
        return False, f"[MP-005] {VALIDATION_ERRORS['MP-005']}"
    return True, ""


def validate_data(data: str) -> tuple[bool, str]:
    try:
        datetime.strptime(data, "%Y-%m-%d")
        return True, ""
    except (ValueError, TypeError):
        return False, f"[MP-006] {VALIDATION_ERRORS['MP-006']}"


def validate_iban(iban: str) -> tuple[bool, str]:
    if not iban or not _IBAN_RE.match(iban):
        return False, f"[MP-008] {VALIDATION_ERRORS['MP-008']}"
    return True, ""


def validate_tipo_id(tipo: str) -> tuple[bool, str]:
    if tipo not in ("F", "G"):
        return False, f"[MP-010] {VALIDATION_ERRORS['MP-010']}"
    return True, ""


def validate_causale(causale: str) -> tuple[bool, str]:
    if not causale.strip() or len(causale) > 1024:
        return False, f"[MP-007] {VALIDATION_ERRORS['MP-007']}"
    return True, ""


def validate_cf_piva(codice: str, tipo: str) -> tuple[bool, str]:
    if codice == "ANONIMO":
        return True, ""
    if tipo == "F":
        if len(codice) != 16 or not codice.isalnum():
            return False, f"[MP-002] {VALIDATION_ERRORS['MP-002']}"
    elif tipo == "G":
        if len(codice) != 11 or not codice.isdigit():
            return False, f"[MP-003] {VALIDATION_ERRORS['MP-003']}"
    return True, ""


def validate_row(row: dict) -> list[str]:
    errors: list[str] = []
    for fname, _label, required, _wtype, _tip in FIELDS:
        if required and not row.get(fname, "").strip():
            errors.append(f"[MP-009] Campo obbligatorio mancante: {fname}")

    tipo_id = row.get("tipoIdentificativoUnivoco", "")
    if tipo_id:
        ok, msg = validate_tipo_id(tipo_id)
        if not ok:
            errors.append(msg)

    codice_id = row.get("codiceIdentificativoUnivoco", "")
    if codice_id and tipo_id in ("F", "G"):
        ok, msg = validate_cf_piva(codice_id, tipo_id)
        if not ok:
            errors.append(msg)

    if row.get("IUD"):
        ok, msg = validate_iud(row["IUD"])
        if not ok:
            errors.append(msg)

    if row.get("importoDovuto"):
        ok, msg = validate_importo(row["importoDovuto"])
        if not ok:
            errors.append(msg)

    if row.get("datiSpecificiRiscossione"):
        ok, msg = validate_dsr(row["datiSpecificiRiscossione"])
        if not ok:
            errors.append(msg)

    if row.get("dataEsecuzionePagamento"):
        ok, msg = validate_data(row["dataEsecuzionePagamento"])
        if not ok:
            errors.append(msg)

    if row.get("causaleVersamento"):
        ok, msg = validate_causale(row["causaleVersamento"])
        if not ok:
            errors.append(msg)

    if row.get("flagMultiBeneficiario", "").lower() == "true":
        if not row.get("codiceFiscaleEnteSecondario"):
            errors.append(f"[MP-011] {VALIDATION_ERRORS['MP-011']}")
        iban = row.get("ibanAccreditoEnteSecondario", "").strip()
        if not iban:
            errors.append(f"[MP-011] {VALIDATION_ERRORS['MP-011']}")
        else:
            ok, msg = validate_iban(iban)
            if not ok:
                errors.append(msg)
        imp_sec = row.get("importoVersamentoEnteSecondario", "").strip()
        if not imp_sec:
            errors.append(f"[MP-011] {VALIDATION_ERRORS['MP-011']}")
        else:
            ok, msg = validate_importo(imp_sec)
            if not ok:
                errors.append(msg)

    bilancio_xml = row.get("bilancio")
    imp_val = to_float(row.get("importoDovuto"), silent=True)
    if bilancio_xml and imp_val is not None:
        try:
            caps = parse_bilancio_xml(bilancio_xml)
            totale = sum(
                to_float(acc.get("importo"), silent=True) or 0.0
                for cap in caps
                for acc in cap.get("accertamenti", [])
            )
            if abs(totale - imp_val) > 0.005:
                errors.append(
                    f"[MP-012] {VALIDATION_ERRORS['MP-012']} (bil={totale:.2f}, att={imp_val:.2f})"
                )
        except Exception:
            pass
    return errors
