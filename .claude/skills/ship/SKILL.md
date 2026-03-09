---
name: ship
description: Executa o fluxo completo de commit, push e acompanhamento de deploy na Vercel. Use quando o usuário quiser commitar e deployar as alterações atuais.
disable-model-invocation: true
---

# Skill: Ship — Commit + Push + Deploy

Executa o fluxo completo de entrega das alterações atuais.

## Passos

### 1. Verificar o que mudou
```bash
git status
git diff --stat
```
Mostre ao usuário um resumo das alterações antes de continuar.

### 2. Sugerir mensagem de commit
Com base nas alterações encontradas, sugira uma mensagem de commit no formato:
```
tipo: descrição curta em pt-BR
```
Tipos: `feat`, `fix`, `refactor`, `chore`, `docs`, `style`

Pergunte ao usuário: **"Pode commitar com essa mensagem ou quer alterar?"**
Aguarde confirmação antes de continuar.

### 3. Executar commit e push
```bash
git add .
git commit -m "mensagem confirmada"
git push
```

### 4. Acompanhar o deploy
Após o push, use o MCP da Vercel para:
- Buscar o deploy mais recente do projeto
- Aguardar o status final (READY ou ERROR)
- Se **READY**: informe o usuário com a URL do deploy ✅
- Se **ERROR**: busque os logs de build automaticamente e apresente o erro com sugestão de correção

---

## Comportamento esperado

- Nunca commite sem mostrar o resumo das alterações primeiro
- Nunca commite sem confirmação da mensagem
- Se o push falhar, informe o erro e não tente o deploy
- Se não houver MCP da Vercel configurado, informe o usuário e encerre após o push
