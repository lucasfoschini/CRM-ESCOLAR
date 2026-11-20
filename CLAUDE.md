# CLAUDE.md — código do Belo Ramo CRM

Este repositório é só o código do protótipo. O manual do projeto, a documentação oficial e o grafo de conhecimento ficam no vault do Obsidian, em outra pasta.

## Primeiro passo de toda sessão

Antes de qualquer tarefa, leia o manual permanente do projeto:

`D:\CRM BELO RAMO\CLAUDE.md`

Ele define como agir (fase atual, fonte da verdade, decisões, segurança e LGPD, regras de trabalho) e prevalece sobre suposições. Siga-o como se estivesse neste arquivo.

## Onde estão as coisas

| O quê | Onde |
|---|---|
| Vault do Obsidian (histórico, decisões originais) | `D:\CRM BELO RAMO\` |
| Documentação oficial (`docs/`) | `D:\CRM BELO RAMO\docs\` |
| Grafo do Graphify (gerado de `docs/`) | `D:\CRM BELO RAMO\graphify-out\` |
| Consulta tipada ao grafo | `D:\CRM BELO RAMO\ferramentas\consulta_grafo.py` |

- Os caminhos relativos do manual do vault (`docs/`, `ferramentas/`, `graphify-out/`) são relativos a `D:\CRM BELO RAMO\`, não a este repositório.
- Comandos do Graphify e do `consulta_grafo.py` rodam com o diretório de trabalho no vault (`cd "D:\CRM BELO RAMO"`).
- Não existe `graphify-out/` neste repositório: não rode `/graphify` aqui sem pedido.
- Consulte o grafo e `docs/` só quando a tarefa precisar (requisitos, regras, decisões, impacto). Leia só a seção necessária.
