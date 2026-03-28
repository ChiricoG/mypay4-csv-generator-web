# SPDX-License-Identifier: EUPL-1.2
import copy
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, "py"))

from mypay4_core.bulk_increase import apply_bulk_increase
from mypay4_core.xml_engine import parse_bilancio_xml


def _row_with_bilancio():
    return {
        "importoDovuto": "100.00",
        "bilancio": "<bilancio><capitolo><codCapitolo>CAP1</codCapitolo><accertamento><importo>100.00</importo></accertamento></capitolo></bilancio>",
    }


def test_bulk_percent_preesistente_updates_accertamento():
    row = copy.deepcopy(_row_with_bilancio())
    apply_bulk_increase([row], "percentuale", 10.0, "preesistente", "", "", "", "")
    assert row["importoDovuto"] == "110.00"
    caps = parse_bilancio_xml(row["bilancio"])
    assert caps[0]["accertamenti"][0]["importo"] == "110.00"


def test_bulk_fisso_sostituisci_replaces_capitoli():
    row = copy.deepcopy(_row_with_bilancio())
    apply_bulk_increase(
        [row],
        "fisso",
        5.0,
        "sostituisci",
        "",
        "NEWCAP",
        "UFF",
        "ACC1",
    )
    assert row["importoDovuto"] == "105.00"
    caps = parse_bilancio_xml(row["bilancio"])
    assert len(caps) == 1
    assert caps[0]["codCapitolo"] == "NEWCAP"
    assert caps[0]["codUfficio"] == "UFF"
    assert caps[0]["accertamenti"][0]["codAccertamento"] == "ACC1"
    assert caps[0]["accertamenti"][0]["importo"] == "105.00"


def test_bulk_differenza_appends_capitolo():
    row = copy.deepcopy(_row_with_bilancio())
    apply_bulk_increase(
        [row],
        "fisso",
        50.0,
        "differenza",
        "",
        "DELTA",
        "",
        "",
    )
    assert row["importoDovuto"] == "150.00"
    caps = parse_bilancio_xml(row["bilancio"])
    assert len(caps) == 2
    assert caps[-1]["codCapitolo"] == "DELTA"
    assert caps[-1]["accertamenti"][0]["importo"] == "50.00"
