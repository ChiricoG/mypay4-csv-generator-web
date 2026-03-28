# SPDX-License-Identifier: EUPL-1.2
import re


def build_bilancio_xml(capitoli: list[dict]) -> str:
    parts = ["<bilancio>"]
    for cap in capitoli:
        parts.append("<capitolo>")
        if cap.get("codCapitolo"):
            parts.append(f"<codCapitolo>{cap['codCapitolo']}</codCapitolo>")
        if cap.get("codUfficio"):
            parts.append(f"<codUfficio>{cap['codUfficio']}</codUfficio>")
        for acc in cap.get("accertamenti", []):
            parts.append("<accertamento>")
            if acc.get("codAccertamento"):
                parts.append(f"<codAccertamento>{acc['codAccertamento']}</codAccertamento>")
            parts.append(f"<importo>{acc['importo']}</importo>")
            parts.append("</accertamento>")
        parts.append("</capitolo>")
    parts.append("</bilancio>")
    return "".join(parts)


def parse_bilancio_xml(xml_str: str | None) -> list[dict]:
    if not xml_str:
        return []
    capitoli = []
    for cb in re.findall(r"<capitolo>(.*?)</capitolo>", xml_str, re.DOTALL):
        cap = {}
        m = re.search(r"<codCapitolo>(.*?)</codCapitolo>", cb)
        if m:
            cap["codCapitolo"] = m.group(1)
        m = re.search(r"<codUfficio>(.*?)</codUfficio>", cb)
        if m:
            cap["codUfficio"] = m.group(1)
        accs = []
        for ab in re.findall(r"<accertamento>(.*?)</accertamento>", cb, re.DOTALL):
            acc = {}
            m = re.search(r"<codAccertamento>(.*?)</codAccertamento>", ab)
            if m:
                acc["codAccertamento"] = m.group(1)
            m = re.search(r"<importo>(.*?)</importo>", ab)
            if m:
                acc["importo"] = m.group(1)
            accs.append(acc)
        cap["accertamenti"] = accs
        capitoli.append(cap)
    return capitoli
