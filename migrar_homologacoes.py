"""
Execute na pasta backend para adicionar autor e descricao na tabela homologacoes
e converter categoria de Enum para TEXT.
Uso:
    cd backend
    python migrar_homologacoes.py
"""
import sqlite3, os

DB_PATH = "portal_servicos.db"
if not os.path.exists(DB_PATH):
    print(f"Banco '{DB_PATH}' não encontrado.")
    exit(1)

conn = sqlite3.connect(DB_PATH)
cur = conn.cursor()

cur.execute("PRAGMA table_info(homologacoes)")
colunas = {r[1]: r[2] for r in cur.fetchall()}
print(f"Colunas atuais: {list(colunas.keys())}")

cur.execute("""
    CREATE TABLE IF NOT EXISTS homologacoes_nova (
        id TEXT PRIMARY KEY,
        titulo TEXT NOT NULL,
        descricao TEXT,
        marca TEXT NOT NULL,
        modelo TEXT NOT NULL,
        ano INTEGER NOT NULL,
        categoria TEXT NOT NULL,
        autor TEXT,
        arquivo_url TEXT,
        drive_file_id TEXT,
        atualizado_em DATE
    )
""")

cat_map = {
    'caminhoes': 'Caminhões', 'Caminhões': 'Caminhões',
    'onibus': 'Ônibus', 'Ônibus': 'Ônibus',
    'maquinas': 'Máquinas', 'Máquinas': 'Máquinas',
    'veiculos_leves': 'Veículos Leves', 'Veículos Leves': 'Veículos Leves',
    'equipamentos_especiais': 'Equipamentos Especiais', 'Equipamentos Especiais': 'Equipamentos Especiais',
}

cur.execute("SELECT * FROM homologacoes")
rows = cur.fetchall()
cols = [d[0] for d in cur.description]
print(f"Migrando {len(rows)} homologações...")

for row in rows:
    r = dict(zip(cols, row))
    r['categoria'] = cat_map.get(r.get('categoria', ''), r.get('categoria', 'Caminhões'))
    r.setdefault('descricao', None)
    r.setdefault('autor', None)
    r.setdefault('drive_file_id', None)
    cur.execute("""
        INSERT OR REPLACE INTO homologacoes_nova
        (id, titulo, descricao, marca, modelo, ano, categoria, autor, arquivo_url, drive_file_id, atualizado_em)
        VALUES (:id, :titulo, :descricao, :marca, :modelo, :ano, :categoria, :autor, :arquivo_url, :drive_file_id, :atualizado_em)
    """, r)

cur.execute("DROP TABLE homologacoes")
cur.execute("ALTER TABLE homologacoes_nova RENAME TO homologacoes")
conn.commit()
conn.close()
print(f"✅ {len(rows)} homologações migradas com sucesso.")
