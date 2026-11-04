# Etapa 2 — Domain Map

Decompõe o produto da visão em bounded contexts conceituais, com fronteiras claras e sem
sobreposição. O resultado é clareza conceitual, não arquitetura física.
Template: [domain-map-template.md](../templates/domain-map-template.md).

## Regras

1. Cada domínio tem uma responsabilidade única, que cabe numa frase.
2. Domínios não se sobrepõem. Evite granularidade excessiva.
3. Não desenhe serviços: agrupar domínios em unidades de deploy é decisão do baseline.
4. Ambiguidade na visão que muda uma fronteira: pare e pergunte. Não assuma escopo.
5. Fora do escopo: implementação, APIs, contratos, banco, tarefas e PRDs.

## Processo

1. **Análise da visão.** Extraia fluxos de valor, atores, capacidades implícitas, candidatos a área
   de responsabilidade e termos que devem virar linguagem ubíqua.
2. **Domínios.** Para cada um: responsabilidade, o que não faz, entidades conceituais, linguagem
   ubíqua, interações e justificativa da separação.
3. **Mapa.** Dependências entre domínios com o dono conceitual do dado em cada troca, conflitos
   potenciais e candidatos a fusão ou divisão.

A tabela de dependências é a fonte das **juntas** que os domain docs herdam. Junta que falta aqui é
lacuna do mapa e volta para cá, não é inventada adiante.

## Antes de entregar

- [ ] Cada domínio tem fronteira clara e nenhuma responsabilidade aparece em dois.
- [ ] O número de domínios é proporcional à complexidade da visão.
- [ ] Cada dependência declara o dono do dado.
- [ ] Quem não participou da análise entende o sistema resultante.
