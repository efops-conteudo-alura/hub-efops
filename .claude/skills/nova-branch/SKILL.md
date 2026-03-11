---
name: nova-branch
description: Cria uma nova branch de trabalho seguindo o padrão do projeto Hub EfOps. Use quando o usuário quiser começar a trabalhar em uma nova feature, correção ou melhoria.
disable-model-invocation: true
---

# Skill: Nova Branch — Hub EfOps

Cria uma nova branch de trabalho a partir do `main` atualizado, seguindo o padrão de nomenclatura do projeto.

## Passos

### 1. Garantir que o main está atualizado
```bash
git checkout main
git pull origin main
```

### 2. Perguntar o que será desenvolvido
Pergunte ao usuário: **"O que você vai desenvolver nessa branch?"**

Com base na resposta, sugira um nome no formato:
```
tipo/descricao-curta-em-kebab-case
```

Tipos:
- `feature/` — nova funcionalidade
- `fix/` — correção de bug
- `refactor/` — melhoria sem nova funcionalidade
- `chore/` — configuração, dependências, infraestrutura

Exemplos:
- `feature/modulo-instrutores`
- `fix/calculo-kpis-mes-atual`
- `refactor/padroniza-api-routes`

Confirme o nome com o usuário antes de criar.

### 3. Criar e entrar na branch
```bash
git checkout -b nome-da-branch
```

### 4. Confirmar ao usuário
Informe que a branch foi criada e que agora pode começar a trabalhar normalmente. Quando terminar, deve usar `/ship-branch` para commitar, abrir o PR e acompanhar o deploy de preview.

---

## Comportamento esperado
- Sempre partir do `main` atualizado — nunca criar branch a partir de outra branch
- Nunca criar branch sem confirmar o nome com o usuário
- Nomes de branch sempre em minúsculo e com hífens, sem espaços ou caracteres especiais
