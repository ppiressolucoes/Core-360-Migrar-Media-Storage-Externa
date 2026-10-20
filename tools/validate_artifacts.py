#!/usr/bin/env python3
import json
import subprocess
import sys
import unicodedata
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

WORKFLOWS = {
    'PEL _ Migração Featured IMG _ PAI.json': 'featured-pai',
    'PEL _ Featured Associação WP _ Sub 01 Fluxo.json': 'featured-associacao-sub01',
    'PEL _ Featured Exclusão e Auditoria _ Sub 02.json': 'featured-exclusao-sub02',
    'SUB _ Midia Externa Cloudinary.json': 'storage-upload',
    'CORE _ Cloudinary Gestão de Contas.json': 'core-cloudinary-contas',
}

PROCEDURES = {
    'SP_WP_avanca_checkpoint_featured.sql',
    'SP_WP_conclui_migracao_featured_lote.sql',
    'SP_WP_fecha_checkpoint_featured.sql',
    'SP_WP_recupera_migracao_featured_processing.sql',
    'SP_WP_registra_associacao_lote.sql',
    'SP_WP_registra_erro_associacao.sql',
    'SP_WP_registra_midia_externa.sql',
    'SP_WP_registra_storage_lote.sql',
    'SP_WP_reserva_migracao_featured.sql',
}


def slugify(name):
    value = unicodedata.normalize('NFKD', name)
    value = value.encode('ascii', 'ignore').decode().lower()
    return re.sub(r'[^a-z0-9]+', '-', value).strip('-') or 'code-node'


def fail(message):
    print(f'ERRO: {message}', file=sys.stderr)
    raise SystemExit(1)


total_codes = 0

for filename, folder in WORKFLOWS.items():
    workflow_path = ROOT / 'workflows' / 'n8n' / 'official' / filename
    if not workflow_path.is_file():
        fail(f'workflow ausente: {workflow_path}')

    workflow = json.loads(workflow_path.read_text())
    used = {}

    for node in workflow.get('nodes', []):
        if node.get('type') != 'n8n-nodes-base.code':
            continue

        name = node.get('name', 'code-node')
        slug = slugify(name)
        used[slug] = used.get(slug, 0) + 1
        if used[slug] > 1:
            slug = f'{slug}-{used[slug]}'

        code_path = ROOT / 'workflows' / 'code' / folder / f'{slug}.js'
        if not code_path.is_file():
            fail(f'Code node ausente: {code_path}')

        expected = node.get('parameters', {}).get('jsCode', '').rstrip()
        actual = code_path.read_text()
        marker = '// Extraído do export n8n oficial.\n\n'
        if marker not in actual:
            fail(f'cabeçalho inválido: {code_path}')
        actual = actual.split(marker, 1)[1].rstrip()

        if actual != expected:
            fail(f'Code node diverge do JSON: {code_path}')

        # Code nodes do n8n aceitam await/return no corpo de uma função async.
        # Compilar como arquivo CommonJS geraria falso positivo para top-level await.
        result = subprocess.run(
            [
                'node',
                '-e',
                (
                    "const fs=require('fs');"
                    "const AsyncFunction=Object.getPrototypeOf(async function(){}).constructor;"
                    "new AsyncFunction(fs.readFileSync(process.argv[1],'utf8'));"
                ),
                str(code_path),
            ],
            capture_output=True,
            text=True,
        )
        if result.returncode:
            fail(f'JavaScript inválido em {code_path}: {result.stderr.strip()}')

        total_codes += 1

for filename in PROCEDURES:
    path = ROOT / 'database' / 'procedures' / filename
    if not path.is_file():
        fail(f'procedure ausente: {path}')
    text = path.read_text()
    procedure = filename.removesuffix('.sql')
    if f'PROCEDURE `{procedure}`' not in text:
        fail(f'nome da procedure diverge do arquivo: {path}')

print(
    f'OK: {len(WORKFLOWS)} workflows oficiais, '
    f'{total_codes} Code nodes e {len(PROCEDURES)} procedures.'
)
