# BEM VINDO AO NOSSO PROGRAMA PARA GERENCIAMENTO DE ESTOQUE

Integrantes: Caio Mansueto \ Matheus Santos

Sistema desenvolvido para facilitar cadastro, a consulta e o gerenciamento eficiente de peças em estoque

# principais funcionalidades 
- cadastro de peças: registrando detalhadamente com;
    código, nome, categoria, quantidade e localisação
- controle de movimentação:registro rapido de entrada;
    compras/ reposições
- busca inteligente: consulta rapida;
    por: código, nome ou categoria
- alerta de esque baixo: visualisação clara de peças para reposição

# tecnologias utilisadas
- node_modules \ HTML \ JavaScript \ server.js
- [banco de dadso - MySQL]

## Configuração do banco

O servidor usa o banco `banco_estoque` e a tabela `itens`. Crie a estrutura no MySQL antes de iniciar:

```sql
CREATE DATABASE banco_estoque;
USE banco_estoque;

CREATE TABLE itens (
    id INT AUTO_INCREMENT PRIMARY KEY,
    descricao VARCHAR(255) NOT NULL,
    quantidade INT NOT NULL DEFAULT 0,
    preco DECIMAL(10, 2) NOT NULL DEFAULT 0
);
```

Configure as credenciais do MySQL em `db.js` e inicie o servidor com `node server_junto.js`.