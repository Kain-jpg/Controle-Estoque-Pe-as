
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

    // Identifica o ID do aluno pela URL
    const idAluno = pathname && pathname.startsWith('/api/alunos/')
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

    // ROTA 2: Consulta os alunos no banco de dados
    } else if (
        req.method === 'GET' &&
        pathname === '/api/alunos'
    ) {
        try {
            const [rows] = await pool.query(
                `SELECT id, matricula, nome, cpf, celular, curso
                 FROM alunos
                 ORDER BY id`
            );

            enviarJSON(res, 200, rows);

        } catch (err) {
            console.error(err);

            enviarJSON(res, 500, {
                erro: 'Erro ao buscar alunos: ' + err.message
            });
        }

    // ROTA 3: Cadastra um novo aluno
    } else if (
        req.method === 'POST' &&
        pathname === '/api/alunos'
    ) {
        try {
            const aluno = await lerCorpo(req);

            const { matricula, nome, cpf, celular, curso } = aluno;

            const campos = [matricula, nome, cpf, celular, curso];

            if (campos.some(valor =>
                valor === undefined ||
                valor === null ||
                String(valor).trim() === ''
            )) {
                return enviarJSON(res, 400, {
                    erro: 'Todos os campos são obrigatórios.'
                });
            }

            const [resultado] = await pool.query(
                `INSERT INTO alunos
                (matricula, nome, cpf, celular, curso)
                VALUES (?, ?, ?, ?, ?)`,
                [matricula, nome, cpf, celular, curso]
            );

            enviarJSON(res, 201, {
                mensagem: 'Aluno cadastrado com sucesso!',
                id: resultado.insertId
            });

        } catch (err) {
            console.error(err);

            if (err.message === 'JSON inválido') {
                return enviarJSON(res, 400, {
                    erro: 'Os dados enviados não são um JSON válido.'
                });
            }

            enviarJSON(res, 500, {
                erro: 'Erro ao cadastrar aluno: ' + err.message
            });
        }

    // ROTA 4: Alterar aluno
    } else if (
        req.method === 'PUT' &&
        idAluno !== null
    ) {
        try {
            if (!Number.isInteger(idAluno) || idAluno <= 0) {
                return enviarJSON(res, 400, {
                    erro: 'ID do aluno inválido.'
                });
            }

            const aluno = await lerCorpo(req);

            const { matricula, nome, cpf, celular, curso } = aluno;

            const campos = [matricula, nome, cpf, celular, curso];

            if (campos.some(valor =>
                valor === undefined ||
                valor === null ||
                String(valor).trim() === ''
            )) {
                return enviarJSON(res, 400, {
                    erro: 'Todos os campos são obrigatórios.'
                });
            }

            // Verifica se o aluno existe
            const [alunos] = await pool.query(
                'SELECT id FROM alunos WHERE id = ?',
                [idAluno]
            );

            if (alunos.length === 0) {
                return enviarJSON(res, 404, {
                    erro: 'Aluno não encontrado.'
                });
            }

            // Atualiza os dados do aluno
            await pool.query(
                `UPDATE alunos
                 SET matricula = ?, nome = ?, cpf = ?, celular = ?, curso = ?
                 WHERE id = ?`,
                [matricula, nome, cpf, celular, curso, idAluno]
            );

            enviarJSON(res, 200, {
                mensagem: 'Aluno alterado com sucesso!'
            });

        } catch (err) {
            console.error(err);

            if (err.message === 'JSON inválido') {
                return enviarJSON(res, 400, {
                    erro: 'Os dados enviados não são um JSON válido.'
                });
            }

            enviarJSON(res, 500, {
                erro: 'Erro ao alterar aluno: ' + err.message
            });
        }

    // ROTA 5: Excluir aluno
    } else if (
        req.method === 'DELETE' &&
        idAluno !== null
    ) {
        try {
            // Verifica se o ID é válido
            if (!Number.isInteger(idAluno) || idAluno <= 0) {
                return enviarJSON(res, 400, {
                    erro: 'ID do aluno inválido.'
                });
            }

            // Verifica se o aluno existe
            const [alunos] = await pool.query(
                'SELECT id FROM alunos WHERE id = ?',
                [idAluno]
            );

            if (alunos.length === 0) {
                return enviarJSON(res, 404, {
                    erro: 'Aluno não encontrado.'
                });
            }

            // Exclui o aluno do banco de dados
            await pool.query(
                'DELETE FROM alunos WHERE id = ?',
                [idAluno]
            );

            enviarJSON(res, 200, {
                mensagem: 'Aluno excluído com sucesso!'
            });

        } catch (err) {
            console.error(err);

            enviarJSON(res, 500, {
                erro: 'Erro ao excluir aluno: ' + err.message
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
