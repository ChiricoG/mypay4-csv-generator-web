# SPDX-License-Identifier: EUPL-1.2
import io
import os
import sys
import zipfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PARENT = os.path.dirname(ROOT)
sys.path.insert(0, os.path.join(ROOT, "py"))
sys.path.insert(0, os.path.join(PARENT, "src"))

from mypay4_core.csv_flow import rows_to_zip_bytes as web_rows_to_zip_bytes
from mypay4_core.constants import HEADER as WEB_HEADER
from mypay4_generator.core.constants import HEADER as DESKTOP_HEADER


def _make_minimal_row(**overrides):
    base = {k: "" for k in WEB_HEADER}
    base.update(
        {
            "IUD": "ABC001",
            "tipoIdentificativoUnivoco": "F",
            "codiceIdentificativoUnivoco": "RSSMRA85T10A562S",
            "anagraficaPagatore": "Mario Rossi",
            "dataEsecuzionePagamento": "2026-12-31",
            "importoDovuto": "100.00",
            "tipoDovuto": "TIPO_TEST",
            "causaleVersamento": "Pagamento test",
            "datiSpecificiRiscossione": "9/IUV-TEST-001",
            "azione": "I",
        }
    )
    base.update(overrides)
    return base


def test_header_parity():
    assert WEB_HEADER == DESKTOP_HEADER


def test_zip_contains_single_csv():
    payload = web_rows_to_zip_bytes([_make_minimal_row()], "R_PUGLIA-FLUSSO-1_4.csv")
    zf = zipfile.ZipFile(io.BytesIO(payload))
    assert len(zf.namelist()) == 1
    assert zf.namelist()[0].endswith(".csv")


def test_zip_csv_has_correct_header():
    payload = web_rows_to_zip_bytes([_make_minimal_row()], "R_PUGLIA-FLUSSO-1_4.csv")
    zf = zipfile.ZipFile(io.BytesIO(payload))
    csv_name = zf.namelist()[0]
    csv_data = zf.read(csv_name).decode("utf-8")
    first_line = csv_data.splitlines()[0]
    assert first_line == ";".join(WEB_HEADER)
