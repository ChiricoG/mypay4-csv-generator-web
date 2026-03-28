# SPDX-License-Identifier: EUPL-1.2
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, "py"))

from mypay4_core.validators import validate_row
from mypay4_core.xml_engine import build_bilancio_xml, parse_bilancio_xml


def _row():
    return {
        "IUD": "ABC001",
        "codIuv": "",
        "tipoIdentificativoUnivoco": "F",
        "codiceIdentificativoUnivoco": "RSSMRA85T10A562S",
        "anagraficaPagatore": "Mario Rossi",
        "indirizzoPagatore": "",
        "civicoPagatore": "",
        "capPagatore": "",
        "localitaPagatore": "",
        "provinciaPagatore": "",
        "nazionePagatore": "",
        "mailPagatore": "",
        "dataEsecuzionePagamento": "2026-12-31",
        "importoDovuto": "100.00",
        "commissioneCaricoPa": "",
        "tipoDovuto": "TIPO_TEST",
        "tipoVersamento": "ALL",
        "causaleVersamento": "Pagamento test",
        "datiSpecificiRiscossione": "9/IUV-TEST-001",
        "bilancio": "",
        "flgGeneraIuv": "false",
        "flagMultiBeneficiario": "false",
        "codiceFiscaleEnteSecondario": "",
        "denominazioneEnteSecondario": "",
        "ibanAccreditoEnteSecondario": "",
        "indirizzoEnteSecondario": "",
        "civicoEnteSecondario": "",
        "capEnteSecondario": "",
        "localitaEnteSecondario": "",
        "provinciaEnteSecondario": "",
        "nazioneEnteSecondario": "",
        "datiSpecificiRiscossioneEnteSecondario": "",
        "causaleVersamentoEnteSecondario": "",
        "importoVersamentoEnteSecondario": "",
        "azione": "I",
    }


def test_validate_row_ok():
    assert validate_row(_row()) == []


def test_bilancio_round_trip():
    caps = [{"codCapitolo": "CAP001", "accertamenti": [{"importo": "100.00"}]}]
    xml = build_bilancio_xml(caps)
    out = parse_bilancio_xml(xml)
    assert out[0]["codCapitolo"] == "CAP001"
    assert out[0]["accertamenti"][0]["importo"] == "100.00"
