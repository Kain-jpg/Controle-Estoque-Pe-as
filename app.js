require('dotenv').config({ quiet: true });

const express = require('express');
const path = require('path');
const itensRouter = require('./routes/itens');

const app = express();

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public'), { index: false }));
app.use('/', itensRouter);

app.get('/index.html', (req, res) => res.redirect('/'));

app.use((req, res) => {
    res.status(404).send('Página não encontrada.');
});

app.use((err, req, res, next) => {
    console.error(err);
    res.status(500).send('Erro interno ao processar a solicitação.');
});

module.exports = app;