# SPDX-License-Identifier: EUPL-1.2
import csv
import io
import os
import zipfile
from .constants import HEADER


def detect_version(fieldnames: list[str]) -> str:
    cols = [c.strip() for c in (fieldnames or [])]
    if "flagMultiBeneficiario" in cols:
        return "1_4"
    if "flgGeneraIuv" in cols:
        return "1_3"
    if "bilancio" in cols:
        return "1_2"
    return "1_1"


def normalize_rows_to_1_4(raw_rows: list[dict]) -> list[dict]:
    normalized = []
    for row in raw_rows:
        norm = {col: "" for col in HEADER}
        for col in HEADER:
            if col in row:
                norm[col] = row[col] or ""
        normalized.append(norm)
    return normalized


def parse_csv_or_zip_bytes(payload: bytes, file_name: str) -> tuple[list[dict], str]:
    if file_name.lower().endswith(".zip"):
        with zipfile.ZipFile(io.BytesIO(payload), "r") as zf:
            csv_name = next((n for n in zf.namelist() if n.lower().endswith(".csv")), None)
            if not csv_name:
                raise ValueError("Nessun file CSV trovato nello ZIP.")
            content = zf.read(csv_name).decode("utf-8")
    else:
        content = payload.decode("utf-8")

    reader = csv.DictReader(io.StringIO(content), delimiter=";")
    raw_rows = list(reader)
    if not raw_rows:
        return [], detect_version(reader.fieldnames or [])
    version = detect_version(reader.fieldnames or [])
    return normalize_rows_to_1_4(raw_rows), version


def rows_to_csv_bytes(rows: list[dict]) -> bytes:
    buf = io.StringIO()
    writer = csv.DictWriter(
        buf,
        fieldnames=HEADER,
        delimiter=";",
        quotechar='"',
        quoting=csv.QUOTE_MINIMAL,
        lineterminator="\r\n",
    )
    writer.writeheader()
    for row in rows:
        writer.writerow({col: row.get(col, "") for col in HEADER})
    return buf.getvalue().encode("utf-8")


def rows_to_zip_bytes(rows: list[dict], csv_name: str) -> bytes:
    if not csv_name.lower().endswith(".csv"):
        csv_name = os.path.splitext(csv_name)[0] + ".csv"
    csv_bytes = rows_to_csv_bytes(rows)
    zip_buf = io.BytesIO()
    with zipfile.ZipFile(zip_buf, "w", zipfile.ZIP_DEFLATED) as zf:
        zf.writestr(csv_name, csv_bytes)
    return zip_buf.getvalue()
