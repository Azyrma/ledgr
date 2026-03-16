#!/usr/bin/env python3
"""Convert bank export files to categorisation spreadsheets."""

import csv
import glob
import os
import re
from datetime import datetime

import openpyxl

INPUT_DIR = "input"
OUTPUT_DIR = "output"

# Lookup table built from Transactions.csv. Matched as case-insensitive substrings.
CATEGORY_LOOKUP = {
    # Personal:Food
    "Coop":                             "Personal:Food",
    "Migros":                           "Personal:Food",
    "Volg":                             "Personal:Food",
    "Too Good To Go":                   "Personal:Food",
    "SV (Schweiz) AG":                  "Personal:Food",
    "Compass Group":                    "Personal:Food",
    "Hot Pasta AG":                     "Personal:Food",
    "The Lemon Grass":                  "Personal:Food",
    "KEBAB HAUS":                       "Personal:Food",
    "McDonald":                         "Personal:Food",
    "Selecta AG":                       "Personal:Food",

    # Personal:Travel/Transport
    "SBB Mobile":                       "Personal:Travel/Transport",
    "URBAN CONNECT":                    "Personal:Travel/Transport",
    "Zürcher Verkehrsverbund":          "Personal:Travel/Transport",
    "Mobility Kundenrechnungen":        "Personal:Travel/Transport",

    # Personal:Clothes
    "Zalando":                          "Personal:Clothes",

    # Bills:Phone
    "Sunrise GmbH":                     "Bills:Phone",
    "Galaxus Abos":                     "Bills:Phone",

    # Due From Parents CHF
    "Luzerner Pensionskasse":           "Due From Parents CHF",

    # Education:VIS
    "Verein der Informatik Studierenden": "Education:VIS",

    # Salary
    "Gutschrift von ETH Zürich":        "Salary",

    # Tax
    "Stadt Zuerich Steueramt":          "Tax",
}
_LOOKUP_LOWER = {k.lower(): v for k, v in CATEGORY_LOOKUP.items()}


def lookup_category(description):
    desc_lower = description.lower()
    for key, category in _LOOKUP_LOWER.items():
        if key in desc_lower:
            return category
    return ""


def write_output(name, rows, date_from, date_to):
    """Write rows to a Moneydance-compatible CSV file.

    Each row may be (date, description, amount) or
    (date, description, amount, category). If the 4th element is present it is
    used as-is; otherwise the category is looked up from the description.
    """
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    from_str = date_from.strftime("%d.%m.%Y")
    to_str = date_to.strftime("%d.%m.%Y")
    out_path = os.path.join(OUTPUT_DIR, f"{name}_{from_str}_{to_str}.csv")

    with open(out_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        for row in rows:
            date, description, amount = row[0], row[1], row[2]
            category = row[3] if len(row) > 3 else lookup_category(description)
            writer.writerow([
                date.strftime("%d.%m.%Y"),
                description,
                f"{amount:.2f}".replace(".", ","),
                category,
            ])

    print(f"  Wrote {len(rows)} transactions -> {out_path}")


def _strip_excel_literal(value):
    """Strip ="..." wrapper that PostFinance uses in some exports."""
    v = value.strip()
    if v.startswith('="') and v.endswith('"'):
        v = v[2:-1]
    return v


def parse_postfinance_csv(path):
    """Parse a PostFinance CSV export.

    Format:
      - 7 metadata rows, then a blank row, then data rows
      - Columns: Date, Type of transaction, Notification text,
                 Credit in CHF, Debit in CHF, Tag, Category
      - Separator: semicolon
      - Date format: DD.MM.YYYY
      - Amounts: credits are positive, debits are negative numbers in
                 the 'Debit in CHF' column (already negative in the file)
    """
    rows = []
    with open(path, newline="", encoding="utf-8-sig") as f:
        reader = csv.reader(f, delimiter=";")
        raw = list(reader)

    # Extract date range from metadata (rows 0 and 1)
    date_from = datetime.strptime(_strip_excel_literal(raw[0][1]), "%d.%m.%Y").date()
    date_to = datetime.strptime(_strip_excel_literal(raw[1][1]), "%d.%m.%Y").date()

    # Find the header row
    header_idx = None
    for i, row in enumerate(raw):
        if row and row[0] == "Date":
            header_idx = i
            break

    if header_idx is None:
        print(f"  WARNING: could not find header in {path}")
        return rows, date_from, date_to

    data_rows = raw[header_idx + 1:]
    for row in data_rows:
        if not row or not row[0] or len(row) < 5:
            continue
        date_str = row[0].strip()
        description = row[2].strip()
        credit_str = row[3].strip()
        debit_str = row[4].strip()

        try:
            date = datetime.strptime(date_str, "%d.%m.%Y").date()
        except ValueError:
            continue

        if credit_str:
            amount = float(credit_str)
        elif debit_str:
            amount = float(debit_str)
        else:
            amount = 0.0

        rows.append((date, description, amount))

    return rows, date_from, date_to


def parse_postfinance_cc_csv(path):
    """Parse a PostFinance credit card CSV export.

    Format:
      - 5 metadata rows, then a header row with:
        Invoicing period; Booking date; Purchase date; Booking details;
        Credit in CHF; Debit in CHF; Tag; Category
      - Separator: semicolon
      - Date format: DD.MM.YYYY (Booking date, column 1)
      - No explicit date range in metadata — derived from transaction dates
    """
    rows = []
    with open(path, newline="", encoding="utf-8-sig") as f:
        reader = csv.reader(f, delimiter=";")
        raw = list(reader)

    header_idx = None
    for i, row in enumerate(raw):
        if row and row[0].strip() == "Invoicing period":
            header_idx = i
            break

    if header_idx is None:
        print(f"  WARNING: could not find header in {path}")
        return rows

    for row in raw[header_idx + 1:]:
        if not row or not row[0].strip() or len(row) < 6:
            continue
        date_str = row[2].strip()
        description = row[3].strip().strip('"')
        credit_str = row[4].strip()
        debit_str = row[5].strip()

        try:
            date = datetime.strptime(date_str, "%d.%m.%Y").date()
        except ValueError:
            continue

        if credit_str:
            amount = float(credit_str)
        elif debit_str:
            amount = float(debit_str)
        else:
            amount = 0.0

        rows.append((date, description, amount))

    return rows


def parse_handelsbanken_xlsx(path):
    """Parse a Handelsbanken XLSX export.

    Format:
      - Several metadata rows, then a header row with:
        Ledger date | Transaction date | Text | Amount | Balance
      - Date format: YYYY-MM-DD (stored as strings or date objects)
      - Period stated in row 6 as "Period: YYYY-MM-DD - YYYY-MM-DD"
    """
    rows = []
    wb = openpyxl.load_workbook(path)
    ws = wb.active
    all_rows = list(ws.iter_rows(values_only=True))

    # Extract date range from "Period: YYYY-MM-DD - YYYY-MM-DD" in row 6
    period_str = str(all_rows[6][0]).strip()  # e.g. "Period: 2026-01-01 - 2026-03-11"
    period_part = period_str.replace("Period:", "").strip()
    parts = period_part.split(" - ")
    date_from = datetime.strptime(parts[0].strip(), "%Y-%m-%d").date()
    date_to = datetime.strptime(parts[1].strip(), "%Y-%m-%d").date()

    header_idx = None
    for i, row in enumerate(all_rows):
        if row and str(row[0]).strip().lower() == "ledger date":
            header_idx = i
            break

    if header_idx is None:
        print(f"  WARNING: could not find header in {path}")
        return rows, date_from, date_to

    for row in all_rows[header_idx + 1:]:
        if not row or row[0] is None:
            continue
        date_val = row[1]
        description = str(row[2]).strip() if row[2] else ""
        amount = row[3]

        # Date may be a datetime object or a string
        if isinstance(date_val, datetime):
            date = date_val.date()
        else:
            try:
                date = datetime.strptime(str(date_val).strip(), "%Y-%m-%d").date()
            except ValueError:
                continue

        if amount is None:
            amount = 0.0

        rows.append((date, description, float(amount)))

    return rows, date_from, date_to


def parse_moneydance_csv(path):
    """Parse a Moneydance CSV export.

    Format:
      - Line 1: "Transactions"
      - Line 2: date range (ignored)
      - Line 3: blank
      - Line 4: header row starting with "Account,Date,Cheque#,..."
      - Data rows: Account, Date (MM/DD/YYYY), Cheque#, Description,
                   Category, C, Amount (e.g. "Fr. -1.80"), Balance
      - Skip rows with empty Account or Description == "Beginning Balance"
    """
    rows = []
    with open(path, newline="", encoding="utf-8-sig") as f:
        reader = csv.reader(f)
        raw = list(reader)

    header_idx = None
    for i, row in enumerate(raw):
        if row and row[0] == "Account" and len(row) > 2 and row[2] == "Cheque#":
            header_idx = i
            break

    if header_idx is None:
        print(f"  WARNING: could not find header in {path}")
        return rows

    for row in raw[header_idx + 1:]:
        if not row or len(row) < 7:
            continue
        account = row[0].strip()
        if not account:
            continue
        description = row[3].strip()
        if description == "Beginning Balance":
            continue
        date_str = row[1].strip()
        try:
            date = datetime.strptime(date_str, "%m/%d/%Y").date()
        except ValueError:
            continue
        amount_raw = re.sub(r'^[A-Za-z]+\.\s*', '', row[6].strip())
        try:
            amount = float(amount_raw)
        except ValueError:
            continue
        category = row[4].strip()
        rows.append((date, description, amount, category))

    return rows


def main():
    # --- PostFinance: account CSV + credit card CSV merged ---
    pf_files = glob.glob(os.path.join(INPUT_DIR, "export_transactions_*.csv"))
    cc_files = glob.glob(os.path.join(INPUT_DIR, "export_credit_cards_overview_*.csv"))

    if pf_files:
        all_pf_rows = []
        pf_from, pf_to = None, None
        for path in pf_files:
            print(f"Reading PostFinance account: {path}")
            rows, date_from, date_to = parse_postfinance_csv(path)
            all_pf_rows.extend(rows)
            pf_from = date_from if pf_from is None else min(pf_from, date_from)
            pf_to = date_to if pf_to is None else max(pf_to, date_to)
        all_pf_rows.sort(key=lambda r: r[0], reverse=True)
        write_output("postfinance", all_pf_rows, pf_from, pf_to)
    else:
        print("No PostFinance account files found.")

    if cc_files:
        all_cc_rows = []
        cc_from, cc_to = None, None
        for path in cc_files:
            print(f"Reading PostFinance credit card: {path}")
            rows = parse_postfinance_cc_csv(path)
            all_cc_rows.extend(rows)
            if rows:
                cc_from = min(r[0] for r in rows) if cc_from is None else min(cc_from, min(r[0] for r in rows))
                cc_to = max(r[0] for r in rows) if cc_to is None else max(cc_to, max(r[0] for r in rows))
        all_cc_rows.sort(key=lambda r: r[0], reverse=True)
        write_output("postfinance_cc", all_cc_rows, cc_from, cc_to)
    else:
        print("No PostFinance credit card files found.")

    # --- Handelsbanken XLSX files ---
    hb_files = glob.glob(os.path.join(INPUT_DIR, "Handelsbanken*.xlsx"))
    if hb_files:
        all_hb_rows = []
        hb_from, hb_to = None, None
        for path in hb_files:
            print(f"Reading Handelsbanken: {path}")
            rows, date_from, date_to = parse_handelsbanken_xlsx(path)
            all_hb_rows.extend(rows)
            hb_from = date_from if hb_from is None else min(hb_from, date_from)
            hb_to = date_to if hb_to is None else max(hb_to, date_to)
        all_hb_rows.sort(key=lambda r: r[0], reverse=True)
        write_output("handelsbanken", all_hb_rows, hb_from, hb_to)
    else:
        print("No Handelsbanken XLSX files found.")

    # --- Moneydance CSV files ---
    md_files = glob.glob(os.path.join(INPUT_DIR, "moneydance", "*.csv"))
    if md_files:
        for path in md_files:
            print(f"Reading Moneydance: {path}")
            rows = parse_moneydance_csv(path)
            if not rows:
                print(f"  No transactions found in {path}")
                continue
            md_from = min(r[0] for r in rows)
            md_to = max(r[0] for r in rows)
            rows_sorted = sorted(rows, key=lambda r: r[0], reverse=True)
            name = os.path.splitext(os.path.basename(path))[0]
            write_output(name, rows_sorted, md_from, md_to)
    else:
        print("No Moneydance CSV files found.")


if __name__ == "__main__":
    main()
