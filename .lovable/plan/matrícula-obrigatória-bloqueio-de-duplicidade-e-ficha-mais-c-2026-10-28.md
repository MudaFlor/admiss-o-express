# Matrícula obrigatória, bloqueio de duplicidade e ficha mais compacta

## 1. Matrícula obrigatória ao cadastrar/importar colaborador
- Nas telas "Novo colaborador" e "Importar candidato aprovado", novo campo obrigatório **Nº de matrícula** (o número gerado no sistema de admissão). O botão de salvar fica desativado até ele ser preenchido.
- A matrícula passa a ser o ID único do colaborador (usa o campo "ID / Matrícula eSocial" que já existe).

## 2. Bloqueio de matrícula repetida
- Se a matrícula já pertencer a outro colaborador, o cadastro é recusado e aparece em vermelho, abaixo do campo: **"CADASTRO JÁ EXISTE"**.
- A mesma regra também vale no banco de dados, então nada passa mesmo se duas pessoas salvarem juntas. Isso inclui editar a matrícula na ficha do colaborador.

## 3. Aviso de CPF repetido
- Antes de salvar, o sistema confere o CPF. Se ele já estiver cadastrado, abre uma janela: **"CPF já está cadastrado, deseja cadastrá-lo novamente?"**
  - **Sim**: o cadastro continua, mas exige uma matrícula nova, diferente da anterior (por exemplo, numa recontratação).
  - **Não**: o processo é cancelado.

## 4. Ficha do candidato mais compacta
- Menos espaço entre as abas e entre os blocos. Cartões mais enxutos.
- Dados organizados em grade de 2 a 3 colunas, com rótulos pequenos acima do valor, para ler mais rápido sem rolar tanto.
- Nada de conteúdo ou função é removido.

## Detalhes técnicos
- Migração: índice único parcial em `employees(matricula_esocial)` onde não é nulo (os colaboradores atuais sem matrícula não são afetados). Antes, conferir se já há valores repetidos.
- `createEmployee`: exige `matricula`, valida que não está vazia, verifica duplicidade e retorna o erro "CADASTRO JÁ EXISTE". O código de violação única (23505) também é convertido nessa mensagem. Novo parâmetro `confirmDuplicateCpf`: sem ele, se o CPF já existir, retorna o código `CPF_EXISTS` para a tela abrir a janela de confirmação.
- `updateEmployeeProfile`: mesma conversão do erro 23505.
- Regras puras em `src/lib/validation/employee-id.ts` com testes (matrícula vazia é recusada, duplicada é bloqueada, CPF repetido pede confirmação).
- `colaboradores.index.tsx`: campo de matrícula, erro em vermelho e AlertDialog do CPF. `candidatos.$id.tsx`: ajustes de espaçamento (`space-y`, `gap`, padding dos cards, TabsList).
