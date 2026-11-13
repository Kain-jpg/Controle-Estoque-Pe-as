
const mysql = require('mysql2/promise');

const conexao = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: 'root',
    database: 'banco_estoque',
    waitForConnections: true,
    connectionLimit: 10
});

module.exports = conexao;

