#!/usr/bin/env python3
"""Build slim RPA Québec catalog JSON from the MSSS annuaire Excel.

Usage: python3 scripts/build-rpa-quebec.py
"""
from __future__ import annotations

import json
import re
from pathlib import Path

import openpyxl

ROOT = Path(__file__).resolve().parents[1]
XLSX = ROOT / "data/rpa/rpa_quebec_annuaire_2025-12-31.xlsx"
OUT = ROOT / "data/rpa/quebec-residences.json"

REGION_NAMES = {
    "1": "Bas-Saint-Laurent",
    "2": "Saguenay–Lac-Saint-Jean",
    "3": "Capitale-Nationale",
    "4": "Mauricie et Centre-du-Québec",
    "5": "Estrie",
    "7": "Outaouais",
    "8": "Abitibi-Témiscamingue",
    "9": "Côte-Nord",
    "10": "Nord-du-Québec",
    "11": "Gaspésie–Îles-de-la-Madeleine",
    "12": "Chaudière-Appalaches",
    "13": "Laval",
    "14": "Lanaudière",
    "15": "Laurentides",
    "16": "Montérégie",
    "61": "Montréal",
    "62": "Montréal",
    "63": "Montréal",
    "64": "Montréal",
    "65": "Montréal",
}

SERVICE_FLAGS = [
    ("repas", "Repas"),
    ("soins_hygiene", "Soins d'hygiène"),
    ("aide_alimentation", "Aide à l'alimentation"),
    ("bain", "Aide au bain"),
    ("habillage", "Habillage"),
    ("admin_des_medicaments", "Administration des médicaments"),
    ("assistance_a_la_mobilite", "Aide à la mobilité"),
    ("assistance_soins_non_reglementees", "Assistance aux soins"),
    ("soins_infirmiers", "Soins infirmiers"),
    ("entretien_menager", "Entretien ménager"),
    ("entretien_vetements_ou_literie", "Entretien des vêtements"),
    ("distribution_des_medicaments", "Distribution des médicaments"),
    ("loisirs", "Loisirs"),
]


def yes(v) -> bool:
    return str(v or "").strip().upper() in {"OUI", "O", "YES", "Y", "1", "TRUE"}


def num(v):
    if v is None or v == "":
        return None
    try:
        return int(float(str(v).replace(",", ".").strip()))
    except ValueError:
        return None


def slug(ref: str) -> str:
    clean = re.sub(r"[^a-zA-Z0-9]+", "-", str(ref).strip()).strip("-").lower()
    return f"rpa-{clean or 'unknown'}"


def main() -> None:
    wb = openpyxl.load_workbook(XLSX, read_only=True, data_only=True)
    ws = wb.active
    rows_iter = ws.iter_rows(values_only=True)
    headers = [str(h).strip() if h is not None else "" for h in next(rows_iter)]
    idx = {h: i for i, h in enumerate(headers)}

    required = [
        "ref_registre",
        "nom_residence",
        "municipalite_rpa",
        "statut_residence",
    ]
    for key in required:
        if key not in idx:
            raise SystemExit(f"Missing column: {key}")

    out = []
    skipped = 0
    for raw in rows_iter:
        statut = str(raw[idx["statut_residence"]] or "").strip()
        if statut != "Active":
            skipped += 1
            continue

        ref = str(raw[idx["ref_registre"]] or "").strip()
        name = str(raw[idx["nom_residence"]] or "").strip()
        if not ref or not name:
            skipped += 1
            continue

        region_code = str(raw[idx.get("region", 0)] or "").strip()
        services = []
        for col, label in SERVICE_FLAGS:
            if col in idx and yes(raw[idx[col]]):
                services.append(label)

        errance = yes(raw[idx["clientele_risque_errance"]]) if "clientele_risque_errance" in idx else False
        if errance and "Clientèle à risque d'errance" not in services:
            services.append("Clientèle à risque d'errance")

        postal = str(raw[idx.get("code_postal_rpa", 0)] or "").replace(" ", "").upper()
        if len(postal) == 6:
            postal = f"{postal[:3]} {postal[3:]}"

        phone = str(raw[idx.get("telephone_rpa", 0)] or "").strip() or None
        address = str(raw[idx.get("adresse_rpa", 0)] or "").strip()
        city = str(raw[idx["municipalite_rpa"]] or "").strip()
        category = str(raw[idx.get("categorie_rpa", 0)] or "").strip()
        cert = str(raw[idx.get("etat_certification", 0)] or "").strip()
        type_res = str(raw[idx.get("type_residence", 0)] or "").strip()
        security = str(raw[idx.get("securite", 0)] or "").strip() or None

        record = {
            "id": slug(ref),
            "ref": ref,
            "name": name,
            "address": address,
            "city": city,
            "postal": postal or None,
            "phone": phone,
            "regionCode": region_code,
            "region": REGION_NAMES.get(region_code, f"Région {region_code}"),
            "mrc": str(raw[idx.get("mrc", 0)] or "").strip() or None,
            "category": category,
            "type": type_res or None,
            "certification": cert or None,
            "capacity": num(raw[idx["capacite_daccueil_des_personnes_dans_la_rpa"]])
            if "capacite_daccueil_des_personnes_dans_la_rpa" in idx
            else None,
            "residents": num(raw[idx["total_de_residents_rpa"]])
            if "total_de_residents_rpa" in idx
            else None,
            "units": num(raw[idx["total_unite_rpa"]]) if "total_unite_rpa" in idx else None,
            "roomsSingle": num(raw[idx["chambres_simples_rpa"]])
            if "chambres_simples_rpa" in idx
            else None,
            "roomsDouble": num(raw[idx["chambres_doubles_rpa"]])
            if "chambres_doubles_rpa" in idx
            else None,
            "apartments": num(raw[idx["logements_rpa"]]) if "logements_rpa" in idx else None,
            "services": services,
            "security": security,
            "entente108": yes(raw[idx["unite_locative_rpa_avec_entente_108"]])
            if "unite_locative_rpa_avec_entente_108" in idx
            else False,
            "sourceDate": str(raw[idx.get("date_extraction", 0)] or "").strip() or None,
        }
        out.append(record)

    out.sort(key=lambda r: (r["region"], r["city"], r["name"]))
    OUT.parent.mkdir(parents=True, exist_ok=True)
    payload = {
        "source": "Registre des RPA — Québec",
        "extractedOn": "2025-12-31",
        "count": len(out),
        "residences": out,
    }
    OUT.write_text(json.dumps(payload, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(f"Wrote {len(out)} active residences → {OUT.relative_to(ROOT)} (skipped {skipped})")


if __name__ == "__main__":
    main()
