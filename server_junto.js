
const http = require('http');
const url = require('url');
const fs = require('fs');
const path = require('path');
const pool = require('./db');

const PORT = 3000;

// Função para enviar respostas em JSON
function enviarJSON(res, status, dados) {
    res.writeHead(status, {
        'Content-Type': 'application/json; charset=utf-8'
    });

    res.end(JSON.stringify(dados));
}

// Função para receber e interpretar o corpo da requisição
function lerCorpo(req) {
    return new Promise((resolve, reject) => {
        let corpo = '';

        req.on('data', pedaco => {
            corpo += pedaco;
        });

        req.on('end', () => {
            try {
                resolve(JSON.parse(corpo));
            } catch (erro) {
                reject(new Error('JSON inválido'));
            }
        });

        req.on('error', reject);
    });
}

const server = http.createServer(async (req, res) => {

    const { pathname } = url.parse(req.url, true);

    // Identifica o ID do item pela URL
    const idItem = pathname && pathname.startsWith('/api/itens/')
        ? Number(pathname.split('/')[3])
        : null;

    // ROTA 1: Entrega o arquivo index.html
    if (req.method === 'GET' && pathname === '/') {

        fs.readFile(
            path.join(__dirname, 'public', 'index.html'),
            'utf8',
            (err, conteudo) => {
                if (err) {
                    console.error(err);

                    res.writeHead(500, {
                        'Content-Type': 'text/plain; charset=utf-8'
                    });

                    return res.end(
                        'Erro ao carregar index.html: ' + err.message
                    );
                }

                res.writeHead(200, {
                    'Content-Type': 'text/html; charset=utf-8'
                });

                res.end(conteudo);
            }
        );

    // ROTA 2: Consulta os itens no banco de dados
    } else if (
        req.method === 'GET' &&
        pathname === '/api/itens'
    ) {
        try {
            const [rows] = await pool.query(
                `SELECT id, descricao, quantidade, preco
                 FROM itens
                 ORDER BY id`
            );

            enviarJSON(res, 200, rows);

        } catch (err) {
            console.error(err);

            enviarJSON(res, 500, {
                erro: 'Erro ao buscar itens: ' + err.message
            });
        }

    // ROTA 3: Cadastra um novo item
    } else if (
        req.method === 'POST' &&
        pathname === '/api/itens'
    ) {
        try {
            const item = await lerCorpo(req);

            const { id, descricao, quantidade, preco } = item;

            if (!Number.isInteger(Number(id)) || Number(id) <= 0 ||
                typeof descricao !== 'string' || descricao.trim() === '' ||
                !Number.isInteger(Number(quantidade)) ||
                Number(quantidade) < 0 || !Number.isFinite(Number(preco)) ||
                Number(preco) < 0) {
                return enviarJSON(res, 400, {
                    erro: 'Informe descrição, quantidade inteira não negativa e preço válido.'
                });
            }

            const [resultado] = await pool.query(
                `INSERT INTO itens (id, descricao, quantidade, preco)
                 VALUES (?, ?, ?, ?)`,
                [Number(id), descricao.trim(), Number(quantidade), Number(preco)]
            );

            enviarJSON(res, 201, {
                mensagem: 'Item cadastrado com sucesso!',
                id: resultado.insertId
            });

        } catch (err) {
            console.error(err);

            if (err.code === 'ER_DUP_ENTRY') {
                return enviarJSON(res, 409, {
                    erro: 'Já existe um item cadastrado com esse ID.'
                });
            }

            if (err.message === 'JSON inválido') {
                return enviarJSON(res, 400, {
                    erro: 'Os dados enviados não são um JSON válido.'
                });
            }

            enviarJSON(res, 500, {
                erro: 'Erro ao cadastrar item: ' + err.message
            });
        }

    // ROTA 4: Movimentar o estoque
    } else if (
        req.method === 'POST' &&
        pathname && pathname.endsWith('/movimentacoes') &&
        idItem !== null
    ) {
        try {
            if (!Number.isInteger(idItem) || idItem <= 0) {
                return enviarJSON(res, 400, {
                    erro: 'ID do item inválido.'
                });
            }

            const movimentacao = await lerCorpo(req);
            const { tipo, quantidade } = movimentacao;

            if (!['entrada', 'saida'].includes(tipo) ||
                !Number.isInteger(Number(quantidade)) || Number(quantidade) <= 0) {
                return enviarJSON(res, 400, {
                    erro: 'Tipo inválido ou quantidade inválida. Informe entrada/saida e uma quantidade inteira maior que zero.'
                });
            }

            const operador = tipo === 'entrada' ? '+' : '-';
            const condicaoSaldo = tipo === 'saida' ? ' AND quantidade >= ?' : '';
            const parametros = tipo === 'saida'
                ? [Number(quantidade), idItem, Number(quantidade)]
                : [Number(quantidade), idItem];

            const [resultado] = await pool.query(
                `UPDATE itens SET quantidade = quantidade ${operador} ?
                 WHERE id = ?${condicaoSaldo}`,
                parametros
            );

            if (resultado.affectedRows === 0) {
                const [itens] = await pool.query(
                    'SELECT id, quantidade FROM itens WHERE id = ?',
                    [idItem]
                );

                if (itens.length === 0) {
                    return enviarJSON(res, 404, { erro: 'Item não encontrado.' });
                }

                return enviarJSON(res, 409, {
                    erro: 'Estoque insuficiente para realizar a saída.'
                });
            }

            const operacao = tipo === 'entrada' ? 'Entrada' : 'Saída';
            enviarJSON(res, 200, {
                mensagem: `${operacao} de ${Number(quantidade)} unidade(s) registrada com sucesso.`
            });

        } catch (err) {
            console.error(err);

            if (err.message === 'JSON inválido') {
                return enviarJSON(res, 400, {
                    erro: 'Os dados enviados não são um JSON válido.'
                });
            }

            enviarJSON(res, 500, {
                erro: 'Erro ao movimentar estoque: ' + err.message
            });
        }

    // ROTA 5: Alterar item
    } else if (
        req.method === 'PUT' &&
        idItem !== null
    ) {
        try {
            if (!Number.isInteger(idItem) || idItem <= 0) {
                return enviarJSON(res, 400, {
                    erro: 'ID do item inválido.'
                });
            }

            const item = await lerCorpo(req);
            const { id, descricao, quantidade, preco } = item;

            if (Number(id) !== idItem ||
                typeof descricao !== 'string' || descricao.trim() === '' ||
                !Number.isInteger(Number(quantidade)) ||
                Number(quantidade) < 0 || !Number.isFinite(Number(preco)) ||
                Number(preco) < 0) {
                return enviarJSON(res, 400, {
                    erro: 'Informe descrição, quantidade inteira não negativa e preço válido.'
                });
            }

            const [itens] = await pool.query(
                'SELECT id FROM itens WHERE id = ?',
                [idItem]
            );

            if (itens.length === 0) {
                return enviarJSON(res, 404, {
                    erro: 'Item não encontrado.'
                });
            }

            await pool.query(
                `UPDATE itens
                 SET descricao = ?, quantidade = ?, preco = ?
                 WHERE id = ?`,
                [descricao.trim(), Number(quantidade), Number(preco), idItem]
            );

            enviarJSON(res, 200, {
                mensagem: 'Item alterado com sucesso!'
            });

        } catch (err) {
            console.error(err);

            if (err.message === 'JSON inválido') {
                return enviarJSON(res, 400, {
                    erro: 'Os dados enviados não são um JSON válido.'
                });
            }

            enviarJSON(res, 500, {
                erro: 'Erro ao alterar item: ' + err.message
            });
        }

    // ROTA 6: Excluir item
    } else if (
        req.method === 'DELETE' &&
        idItem !== null
    ) {
        try {
            // Verifica se o ID é válido
            if (!Number.isInteger(idItem) || idItem <= 0) {
                return enviarJSON(res, 400, {
                    erro: 'ID do item inválido.'
                });
            }

            // Verifica se o item existe
            const [itens] = await pool.query(
                'SELECT id FROM itens WHERE id = ?',
                [idItem]
            );

            if (itens.length === 0) {
                return enviarJSON(res, 404, {
                    erro: 'Item não encontrado.'
                });
            }

            // Exclui o item do banco de dados
            await pool.query(
                'DELETE FROM itens WHERE id = ?',
                [idItem]
            );

            enviarJSON(res, 200, {
                mensagem: 'Item excluído com sucesso!'
            });

        } catch (err) {
            console.error(err);

            enviarJSON(res, 500, {
                erro: 'Erro ao excluir item: ' + err.message
            });
        }

    // ROTA 6: Página não encontrada
    } else {
        res.writeHead(404, {
            'Content-Type': 'text/plain; charset=utf-8'
        });

        res.end('Página não encontrada. Tente /');
    }
});

// Inicia o servidor
server.listen(PORT, () => {
    console.log(`Servidor rodando em http://localhost:${PORT}/`);
});
