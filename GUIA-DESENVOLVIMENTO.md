# Guia de Desenvolvimento — Hub EfOps

Guia prático de como o time EfOps trabalha no Hub. Feito para quem não tem background técnico em Git mas precisa colaborar no projeto sem quebrar nada.

---

## A regra de ouro

> **Nunca trabalhe diretamente no `main`.** O `main` é produção — o que está lá é o que os usuários veem. Todo desenvolvimento acontece em branches separadas.

---

## O fluxo completo

```
main (produção)
     ↓
  git pull          ← sempre atualizar antes de começar
     ↓
nova branch         ← sua área de trabalho isolada
     ↓
desenvolve          ← faz as alterações normalmente
     ↓
commit + push       ← salva e envia para o GitHub
     ↓
Pull Request        ← pede revisão do colega
     ↓
aprovado → merge    ← vai para o main
     ↓
deploy automático   ← Vercel publica em produção
```

---

## Passo a passo com comandos

### Antes de começar qualquer coisa
```bash
git checkout main        # vai para o main
git pull origin main     # baixa as últimas alterações do colega
```
> Faça isso sempre. Se você começar a trabalhar em cima de um main desatualizado, vai ter conflitos na hora do merge.

### Criar sua branch de trabalho
```bash
git checkout -b feature/nome-do-que-voce-vai-fazer
```

Exemplos de nomes bons:
- `feature/modulo-instrutores`
- `fix/erro-calculo-kpis`
- `refactor/melhora-performance-dashboard`

**Ou use a skill `/nova-branch` no Claude Code** — ela faz isso automaticamente.

### Trabalhar normalmente
Faça suas alterações no código como sempre fez. O Claude Code vai continuar funcionando normalmente dentro da sua branch.

### Salvar o progresso (pode fazer várias vezes)
```bash
git add .
git commit -m "feat: adiciona listagem de instrutores"
```
Commite com frequência — cada commit é um ponto de restauração se algo der errado.

### Quando terminar, enviar para revisão
```bash
git push origin nome-da-sua-branch
```

Depois acesse o GitHub e abra um **Pull Request**:
- Título: o que foi feito
- Descrição: por que foi feito e o que mudou
- Revisor: marque o colega

**Ou use a skill `/ship-branch` no Claude Code** — ela faz o commit, push e te guia para abrir o PR.

### Revisar o trabalho do colega
Quando seu colega abrir um PR, você vai receber notificação no GitHub. Acesse o PR, leia o que mudou e:
- Se estiver ok: clique em **Approve** e depois **Merge**
- Se precisar de ajustes: deixe um comentário e peça as correções

### Após o merge
A Vercel detecta automaticamente o merge no `main` e faz o deploy em produção. Você pode acompanhar pelo dashboard da Vercel ou pedindo ao Claude Code com o MCP.

---

## Deploy de preview

Toda branch que você faz push ganha automaticamente uma **URL de preview** na Vercel — uma versão do app com suas alterações para testar antes de ir para produção.

Use para testar tudo antes de pedir o merge. A URL aparece no PR do GitHub e também pode ser consultada via MCP da Vercel.

---

## Situações comuns

### "Meu colega fez alterações no main enquanto eu trabalhava na minha branch"
```bash
git checkout main
git pull origin main
git checkout minha-branch
git merge main
```
Isso traz as alterações do colega para dentro da sua branch. Se houver conflito, o Git vai indicar os arquivos — peça ajuda ao Claude Code para resolver.

### "Commitei algo errado, quero desfazer o último commit"
```bash
git reset --soft HEAD~1
```
Desfaz o commit mas mantém as alterações nos arquivos.

### "Quero ver o histórico de commits"
```bash
git log --oneline
```

### "Quero ver em qual branch estou"
```bash
git branch --show-current
```

---

## Skills disponíveis no Claude Code

| Skill | O que faz |
|---|---|
| `/nova-branch` | Atualiza o main e cria uma branch nova com nome padronizado |
| `/ship-branch` | Commita, faz push e abre PR da branch atual |
| `/ship` | Commita e faz push direto no main (usar só em emergências) |
| `/security-check` | Auditoria de segurança antes de mergear |
| `/code-review` | Revisão de qualidade de um arquivo ou feature |

---

## Regras do time

1. **Nunca fazer push direto no `main`** — sempre via PR
2. **Sempre pedir revisão** antes de mergear — mesmo que seja rápido
3. **Testar no preview** antes de aprovar o merge
4. **Rodar `/security-check`** antes de mergear features novas
5. **Mensagens de commit em pt-BR** e no formato `tipo: descrição`
