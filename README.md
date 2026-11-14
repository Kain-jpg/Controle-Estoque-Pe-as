# Gerenciamento de Estoque

Aplicação web para cadastro, consulta e movimentação de itens em estoque. Desenvolvida com Node.js, Express, EJS e MySQL.

Integrantes: Caio Mansueto e Matheus Santos.

## Instalação e execução

1. Instale as dependências: `npm install`.
2. Copie `.env.example` para `.env` e preencha `DB_PASSWORD` com a senha do MySQL local.
3. Execute o arquivo `script.sql` no MySQL Workbench para criar/atualizar a tabela e inserir os registros demonstrativos.
4. Inicie a aplicação: `npm start`.
5. Acesse `http://localhost:3000`.

O cadastro gera o ID automaticamente. A lista permite pesquisar, editar itens e registrar entradas e saídas; saídas acima do saldo disponível são recusadas.