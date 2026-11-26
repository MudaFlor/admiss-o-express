# Revisão de segurança do FlowRH

## Situação atual
- Verificação rápida do banco de dados: nenhum problema encontrado (permissões e acesso aos dados estão fechados).
- Análise profunda (código, login, permissões, exposição de dados): em andamento; os resultados aparecem na aba Segurança em 5 a 15 minutos.
- Bibliotecas usadas pelo app: várias com falhas conhecidas de gravidade alta, principalmente as de leitura de arquivos Word (currículos) e ferramentas internas.

## O que corrigir (do mais grave ao mais simples)
1. Atualizar as bibliotecas com falhas conhecidas, com prioridade para a leitura de currículos em Word, que processa arquivos enviados por terceiros.
2. Corrigir cada ponto que a análise profunda apontar como crítico ou alto (aplicado assim que o resultado chegar).
3. Conferir de novo os pontos sensíveis já protegidos: links de candidatos (validade de 7 dias), acesso a documentos (links de 5 minutos), exclusões só por administrador e registro em auditoria.
4. Sugestões de melhoria (opcionais, para decidir depois): login em duas etapas para o RH, alerta de tentativas de acesso suspeitas e revisão periódica de quem tem acesso.

## Detalhes técnicos
- Atualizar dependências (mammoth/@xmldom, sharp, undici, zod, js-yaml, browserslist via atualização dos pacotes diretos e overrides) e regenerar bun.lock; rodar testes e dependency_scan.
- Tratar findings do deep scan e marcar como corrigidos via manage_security_finding.
