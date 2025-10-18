import html
import json
import re
from pathlib import Path

STOCK_DIR = Path(r"C:/Users/PC/Downloads/stoklar SVD")

def parse_table(text: str):
    rows = []
    for part in text.split("<tr")[1:]:
        cells = re.findall(r">(.*?)</t[dh]>", part, flags=re.S)
        cleaned = []
        for c in cells:
            cleaned_text = html.unescape(c)
            cleaned_text = re.sub(r"<[^>]+>", "", cleaned_text)
            cleaned.append(cleaned_text.strip())
        if any(cell for cell in cleaned if cell and not cell.startswith("<")):
            rows.append(cleaned)
    return rows

def normalise_rows(table: list[list[str]]):
    normalised = []
    for row in table:
        if row and row[0].startswith("<th "):
            row = row[1:]
        while row and not row[0].strip():
            row = row[1:]
        if row and row[0].strip().isdigit():
            row = row[1:]
        normalised.append(row)
    return normalised

def detect_header(rows: list[list[str]]):
    def is_letter_row(row: list[str]) -> bool:
        letters = [cell for cell in row if cell]
        return bool(letters) and all(len(cell) <= 2 and cell.strip().upper() == cell.strip() for cell in letters)

    for row in rows:
        if is_letter_row(row):
            continue
        joined = " ".join(row).lower()
        if any(keyword in joined for keyword in ("ürün", "stok", "adet", "koli", "renk")):
            return row
    return None

def extract_data_rows(rows: list[list[str]], header_row: list[str] | None, limit: int | None = None):
    def is_letter_row(row: list[str]) -> bool:
        letters = [cell for cell in row if cell]
        return bool(letters) and all(len(cell) <= 2 and cell.strip().upper() == cell.strip() for cell in letters)

    data_rows: list[list[str]] = []
    for row in rows:
        if not any(cell for cell in row if cell):
            continue
        if header_row and row == header_row:
            continue
        if is_letter_row(row):
            continue
        data_rows.append(row)
        if limit is not None and len(data_rows) >= limit:
            break
    return data_rows

def chunk_product_groups(row: list[str], group_size: int = 4):
    groups = []
    for offset in range(0, len(row), group_size):
        group = row[offset:offset + group_size]
        if len(group) < group_size:
            continue
        if not any(group):
            continue
        groups.append((offset // group_size, group))
    return groups

COLUMN_MAPPING = {
    "product_name": 0,
    "koli_ici_adet": 1,
    "toplam_adet": 2,
    "koli_sayisi": 3,
}

SCOPE_COLUMNS = {
    "olcu": 4,
    "renk": 5,
    "hortum_boyu": 6,
    "hammadde": 7,
    "ek_ozellik": 8,
}

def derive_products(rows: list[list[str]]):
    products = []
    for row in rows:
        cells = [cell.strip() for cell in row]
        if cells and cells[0].isdigit():
            cells = cells[1:]
        name = cells[COLUMN_MAPPING["product_name"]] if len(cells) > COLUMN_MAPPING["product_name"] else ""
        if not name:
            continue
        product = {
            "name": name,
            "koli_ici_adet": cells[COLUMN_MAPPING["koli_ici_adet"]] if len(cells) > COLUMN_MAPPING["koli_ici_adet"] else "",
            "toplam_adet": cells[COLUMN_MAPPING["toplam_adet"]] if len(cells) > COLUMN_MAPPING["toplam_adet"] else "",
            "koli_sayisi": cells[COLUMN_MAPPING["koli_sayisi"]] if len(cells) > COLUMN_MAPPING["koli_sayisi"] else "",
            "scope": {
                scope_key: cells[idx] if len(cells) > idx else ""
                for scope_key, idx in SCOPE_COLUMNS.items()
            },
            "raw_row": row,
        }
        products.append(product)
    return products

def analyse_stock_tables():
    summary = {}
    for html_file in sorted(STOCK_DIR.glob("*.html")):
        text = html_file.read_text(encoding="utf-8")
        table = parse_table(text)
        if not table:
            continue
        rows = normalise_rows(table)
        header_row = detect_header(rows)
        data_rows = extract_data_rows(rows, header_row)
        products = derive_products(data_rows)
        summary[html_file.stem] = {
            "header": header_row,
            "sample_rows": data_rows,
            "products": products,
        }
    return summary

if __name__ == "__main__":
    result = analyse_stock_tables()
    output_path = Path(__file__).resolve().parent.parent / "svd-ambalaj-backend" / "data" / "stock.json"
    output_path.write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Stock data written to {output_path}")
