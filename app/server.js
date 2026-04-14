require('dotenv').config();
const express = require('express');
const axios = require('axios');
const jwt = require('jsonwebtoken');
const app = express();

app.set('view engine', 'ejs');
app.use(express.static('public'));

const PORT = 3000;
const SHEET_API = process.env.SHEET_API;

let cache = [];
let lastFetch = 0;

// cache 30s
const parse = require('csv-parse/sync');

async function getData() {
    if (Date.now() - lastFetch < 30000) return cache;

    const res = await axios.get(SHEET_API);

    // parse CSV
    const records = parse.parse(res.data, {
        columns: true,
        skip_empty_lines: true
    });

    // map lại dữ liệu
    cache = records.map(r => ({
        name: r["Software Name"],
        code: r["Software Code"],
        download: r["Link file"],
        video: r["Link video"]
    }));

    lastFetch = Date.now();
    return cache;
}

// HOME
app.get('/', async (req, res) => {
    const data = await getData();

    res.render('index', {
        files: data
    });
});

// FILE PAGE
app.get('/:code', async (req, res) => {
    const data = await getData();
    const file = data.find(f => f.code === req.params.code);

    if (!file) return res.status(404).send("Not found");

    // tạo token tải
    const token = jwt.sign(
        { url: file.download },
        process.env.SECRET_KEY,
        { expiresIn: process.env.TOKEN_EXPIRE + "s" }
    );

    res.render('file', {
        file,
        token
    });
});

// DOWNLOAD (ANTI SHARE)
app.get('/download/:token', (req, res) => {
    try {
        const decoded = jwt.verify(req.params.token, process.env.SECRET_KEY);
        res.redirect(decoded.url);
    } catch {
        res.send("Link hết hạn hoặc không hợp lệ");
    }
});

app.listen(PORT, () => console.log("Server running"));