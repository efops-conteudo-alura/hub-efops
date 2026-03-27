"""
Atualiza todos os títulos h1 do hub-producao-conteudo para usar a classe hub-page-title.
Substitui text-2xl font-bold (e variantes) por hub-page-title.
"""

import subprocess
import base64
import json
import sys
import io

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")

REPO = "efops-conteudo-alura/hub-producao-conteudo"

def get_file(path):
    result = subprocess.run(
        ["gh", "api", f"repos/{REPO}/contents/{path}"],
        capture_output=True, text=True, encoding="utf-8"
    )
    if result.returncode != 0:
        print(f"ERRO ao ler {path}: {result.stderr}")
        return None, None
    data = json.loads(result.stdout)
    content = base64.b64decode(data["content"]).decode("utf-8")
    sha = data["sha"]
    return content, sha

def put_file(path, content, sha, message):
    encoded = base64.b64encode(content.encode("utf-8")).decode("utf-8")
    payload = json.dumps({
        "message": message,
        "content": encoded,
        "sha": sha
    })
    result = subprocess.run(
        ["gh", "api", "--method", "PUT", f"repos/{REPO}/contents/{path}",
         "--input", "-"],
        input=payload, capture_output=True, text=True, encoding="utf-8"
    )
    if result.returncode != 0:
        print(f"ERRO ao salvar {path}: {result.stderr}")
        return False
    print(f"OK: {path}")
    return True

# Lista de substituicoes: (path, replacements)
# replacements: list of (old, new)
FILES = [
    (
        "src/app/(dashboard)/home/page.tsx",
        [('className="text-2xl font-bold mb-2"', 'className="hub-page-title mb-8"')]
    ),
    (
        "src/app/(dashboard)/pesquisa-mercado/page.tsx",
        [('className="text-2xl font-bold mb-1"', 'className="hub-page-title mb-4"')]
    ),
    (
        "src/app/(dashboard)/plano-de-estudos/page.tsx",
        [('className="text-2xl font-bold mb-1"', 'className="hub-page-title mb-4"')]
    ),
    (
        "src/app/(dashboard)/revisao-didatica/page.tsx",
        [('className="text-2xl font-bold mb-1"', 'className="hub-page-title mb-4"')]
    ),
    (
        "src/app/(dashboard)/validacao-ementa/page.tsx",
        [('className="text-2xl font-bold mb-1"', 'className="hub-page-title mb-4"')]
    ),
    (
        "src/app/(dashboard)/biblioteca-de-prompts/_components/prompts-client.tsx",
        [('className="text-2xl font-bold"', 'className="hub-page-title"')]
    ),
    (
        "src/app/(dashboard)/seletor-de-atividades/instrutores/page.tsx",
        [('className="font-heading text-2xl font-bold text-foreground"', 'className="hub-page-title"')]
    ),
    (
        "src/app/(dashboard)/seletor-de-atividades/submissoes/page.tsx",
        [('className="font-heading text-2xl font-bold text-foreground"', 'className="hub-page-title"')]
    ),
    (
        "src/app/(dashboard)/seletor-de-atividades/tarefas/page.tsx",
        [('className="font-heading text-2xl font-bold text-foreground"', 'className="hub-page-title"')]
    ),
    (
        "src/app/(dashboard)/seletor-de-atividades/upload/page.tsx",
        [('className="font-heading text-3xl font-bold text-primary"', 'className="hub-page-title"')]
    ),
]

for path, replacements in FILES:
    content, sha = get_file(path)
    if content is None:
        continue

    original = content
    for old, new in replacements:
        if old not in content:
            print(f"AVISO: padrao nao encontrado em {path}: {old!r}")
        content = content.replace(old, new)

    if content == original:
        print(f"SKIP (sem alteracoes): {path}")
        continue

    put_file(path, content, sha, "style: aplicar hub-page-title nos titulos h1")

print("\nConcluido!")
