---
name: ship-branch
description: Commita, faz push da branch atual e abre Pull Request no GitHub. Use quando o usuário terminar de desenvolver uma feature em uma branch e quiser enviar para revisão.
disable-model-invocation: true
---

# Skill: Ship Branch — Commit + Push + Pull Request

Finaliza o trabalho na branch atual: commita, faz push e abre o PR para revisão.

## Passos

### 1. Verificar branch atual
```bash
git branch --show-current
```
Se estiver no `main`, avise o usuário e encerre — nunca commitar direto no main.

### 2. Verificar o que mudou
```bash
git status
git diff --stat
```
Mostre um resumo das alterações.

### 3. Sugerir mensagem de commit
Com base nas alterações, sugira uma mensagem no formato:
```
tipo: descrição curta em pt-BR
```
Aguarde confirmação antes de continuar.

### 4. Commit e push
```bash
git add .
git commit -m "mensagem confirmada"
git push origin nome-da-branch-atual
```

### 5. Abrir Pull Request
Após o push, oriente o usuário a abrir o PR no GitHub:
```
https://github.com/efops-conteudo-alura/hub-efops/compare/nome-da-branch
```

Lembre o usuário de:
- Escrever um título claro no PR descrevendo o que foi feito
- Descrever brevemente o que mudou e por quê
- Marcar o colega como revisor

### 6. Deploy de preview
Informe que a Vercel vai gerar automaticamente um **deploy de preview** para essa branch — uma URL única para testar antes de ir para produção. Use o MCP da Vercel para buscar a URL de preview assim que estiver disponível.

---

## Comportamento esperado
- Nunca fazer push direto no main
- Nunca pular a etapa de confirmação da mensagem de commit
- Se o push falhar por divergência de histórico, oriente o usuário a fazer `git pull origin nome-da-branch` antes de tentar novamente
