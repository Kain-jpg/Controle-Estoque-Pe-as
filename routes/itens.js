const express = require('express');
const pool = require('../config/db');

const router = express.Router();
const colunas = 'id, descricao, categoria, quantidade, preco, localizacao';

async function buscarItens(termo = '') {
    if (!termo) {
        const [itens] = await pool.query(
            `SELECT ${colunas} FROM itens ORDER BY id`
        );
        return itens;
    }

    const padrao = `%${termo}%`;
    const [itens] = await pool.execute(
        `SELECT ${colunas} FROM itens
         WHERE CAST(id AS CHAR) LIKE ? OR descricao LIKE ? OR categoria LIKE ? OR localizacao LIKE ?
         ORDER BY id`,
        [padrao, padrao, padrao, padrao]
    );
    return itens;
}

function lerItem(body) {
    const descricao = String(body.descricao || '').trim();
    const categoria = String(body.categoria || '').trim();
    const quantidade = Number(body.quantidade);
    const preco = Number(body.preco);
    const localizacao = String(body.localizacao || '').trim();

    if (!descricao || !categoria || !localizacao ||
        !Number.isInteger(quantidade) || quantidade < 0 ||
        !Number.isFinite(preco) || preco < 0) {
        return null;
    }

    return { descricao, categoria, quantidade, preco, localizacao };
}

function mensagemDaUrl(query) {
    const mensagens = {
        salvo: 'Item cadastrado com sucesso.',
        atualizado: 'Item atualizado com sucesso.',
        excluido: 'Item excluído com sucesso.',
        movimento: 'Movimentação de estoque registrada.',
        estoque: 'Estoque insuficiente para realizar a saída.'
    };
    return mensagens[query.mensagem] || mensagens[query.erro] || '';
}

async function renderizarLista(res, opcoes = {}) {
    const busca = opcoes.busca || '';
    const itens = await buscarItens(busca);
    res.status(opcoes.status || 200).render('itens', {
        itens,
        busca,
        itemEdicao: opcoes.itemEdicao || null,
        valores: opcoes.valores || opcoes.itemEdicao || {},
        erro: opcoes.erro || '',
        mensagem: opcoes.mensagem || ''
    });
}

router.get(['/', '/itens'], async (req, res, next) => {
    try {
        await renderizarLista(res, {
            busca: String(req.query.q || ''),
            mensagem: mensagemDaUrl(req.query)
        });
    } catch (err) {
        next(err);
    }
});

router.post('/itens', async (req, res, next) => {
    const item = lerItem(req.body);
    if (!item) {
        try {
            await renderizarLista(res, {
                status: 400,
                valores: req.body,
                erro: 'Preencha todos os campos com valores válidos.'
            });
        } catch (err) {
            next(err);
        }
        return;
    }

    try {
        await pool.execute(
            `INSERT INTO itens (descricao, categoria, quantidade, preco, localizacao)
             VALUES (?, ?, ?, ?, ?)`,
            [item.descricao, item.categoria, item.quantidade, item.preco, item.localizacao]
        );
        res.redirect('/itens?mensagem=salvo');
    } catch (err) {
        next(err);
    }
});

router.get('/itens/:id/editar', async (req, res, next) => {
    try {
        const [itens] = await pool.execute(
            `SELECT ${colunas} FROM itens WHERE id = ?`,
            [req.params.id]
        );
        if (itens.length === 0) {
            return res.status(404).send('Item não encontrado.');
        }
        await renderizarLista(res, { itemEdicao: itens[0] });
    } catch (err) {
        next(err);
    }
});

router.post('/itens/:id/editar', async (req, res, next) => {
    const item = lerItem(req.body);
    if (!item) {
        try {
            await renderizarLista(res, {
                status: 400,
                itemEdicao: { id: req.params.id, ...req.body },
                valores: req.body,
                erro: 'Preencha todos os campos com valores válidos.'
            });
        } catch (err) {
            next(err);
        }
        return;
    }

    try {
        const [resultado] = await pool.execute(
            `UPDATE itens
             SET descricao = ?, categoria = ?, quantidade = ?, preco = ?, localizacao = ?
             WHERE id = ?`,
            [item.descricao, item.categoria, item.quantidade, item.preco, item.localizacao, req.params.id]
        );
        if (resultado.affectedRows === 0) {
                const [itens] = await pool.execute(
                    'SELECT id FROM itens WHERE id = ?',
                    [req.params.id]
                );
                if (itens.length === 0) {
                    return res.status(404).send('Item não encontrado.');
                }
        }
        res.redirect('/itens?mensagem=atualizado');
    } catch (err) {
        next(err);
    }
});

router.post('/itens/:id/movimentacoes', async (req, res, next) => {
    const quantidade = Number(req.body.quantidade);
    const tipo = req.body.tipo;
    if (!['entrada', 'saida'].includes(tipo) ||
        !Number.isInteger(quantidade) || quantidade <= 0) {
        return res.status(400).send('Informe o tipo de movimentação e uma quantidade inteira positiva.');
    }

    try {
        const operador = tipo === 'entrada' ? '+' : '-';
        const condicaoSaldo = tipo === 'saida' ? ' AND quantidade >= ?' : '';
        const parametros = tipo === 'saida'
            ? [quantidade, req.params.id, quantidade]
            : [quantidade, req.params.id];
        const [resultado] = await pool.execute(
            `UPDATE itens SET quantidade = quantidade ${operador} ? WHERE id = ?${condicaoSaldo}`,
            parametros
        );

        if (resultado.affectedRows === 0) {
            const [itens] = await pool.execute('SELECT id FROM itens WHERE id = ?', [req.params.id]);
            if (itens.length === 0) {
                return res.status(404).send('Item não encontrado.');
            }
            return res.redirect('/itens?erro=estoque');
        }
        res.redirect('/itens?mensagem=movimento');
    } catch (err) {
        next(err);
    }
});

router.post('/itens/:id/excluir', async (req, res, next) => {
    try {
        const [resultado] = await pool.execute(
            'DELETE FROM itens WHERE id = ?',
            [req.params.id]
        );
        if (resultado.affectedRows === 0) {
            return res.status(404).send('Item não encontrado.');
        }
        res.redirect('/itens?mensagem=excluido');
    } catch (err) {
        next(err);
    }
});

module.exports = router;