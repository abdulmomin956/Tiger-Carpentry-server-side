const express = require('express');
const cors = require('cors');
const res = require('express/lib/response');
require('dotenv').config();
const port = process.env.PORT || 5000;

const app = express()

app.use(express.json())
app.use(cors())

app.get('/', (req, res) => {
    res.send("server is running")
})

app.listen(port, () => {
    console.log('running this server with ' + port);
})