# SPDX-License-Identifier: EUPL-1.2
"""Aumento massivo importi (flusso e bilancio XML)."""

from .helpers import to_float
from .xml_engine import build_bilancio_xml, parse_bilancio_xml


def apply_bulk_increase(
    rows: list[dict],
    tipo: str,
    delta: float,
    cap_mode: str,
    filtro_cap: str = "",
    new_cod_cap: str = "",
    new_cod_uff: str = "",
    new_cod_acc: str = "",
) -> None:
    """Modifica `rows` in place."""
    for row in rows:

        def _calc_v(v_str: object):
            v = to_float(v_str, True)
            if v is None:
                return None
            return round(v * (1 + delta / 100), 2) if tipo == "percentuale" else round(v + delta, 2)

        new_v = None
        orig_v = to_float(row.get("importoDovuto"), True)
        if orig_v is not None:
            new_v = _calc_v(row["importoDovuto"])
            row["importoDovuto"] = f"{new_v:.2f}"

        if row.get("bilancio"):
            caps = parse_bilancio_xml(row["bilancio"])
            if cap_mode == "preesistente":
                filtro = filtro_cap.strip()
                for cap in caps:
                    if filtro and cap.get("codCapitolo") != filtro:
                        continue
                    for acc in cap.get("accertamenti", []):
                        if acc.get("importo"):
                            res = _calc_v(acc["importo"])
                            if res is not None:
                                acc["importo"] = f"{res:.2f}"
            elif cap_mode == "sostituisci":
                acc = {"importo": row["importoDovuto"]}
                if new_cod_acc:
                    acc["codAccertamento"] = new_cod_acc
                caps = [{"codCapitolo": new_cod_cap, "codUfficio": new_cod_uff, "accertamenti": [acc]}]
            elif cap_mode == "differenza":
                diff = new_v - orig_v if (new_v is not None and orig_v is not None) else 0.0
                if diff > 0.001:
                    acc = {"importo": f"{diff:.2f}"}
                    if new_cod_acc:
                        acc["codAccertamento"] = new_cod_acc
                    caps.append({"codCapitolo": new_cod_cap, "codUfficio": new_cod_uff, "accertamenti": [acc]})
            row["bilancio"] = build_bilancio_xml(caps)
