const express = require('express');
const cors = require('cors');
const res = require('express/lib/response');
require('dotenv').config();
const jwt = require('jsonwebtoken')
const stripe = require("stripe")(process.env.STRIPE_KEY);
const port = process.env.PORT || 5000;

const app = express()


app.use(express.json())
app.use(cors())






const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster1.mb5zre9.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

function verifyJWT(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).send({ message: 'UnAuthorized access' });
    }
    const token = authHeader.split(' ')[1];
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, function (err, decoded) {
        if (err) {
            return res.status(403).send({ message: 'Forbidden access' });
        }
        req.decoded = decoded;
        next();
    })
}

async function run() {
    try {
        await client.connect();

        const productsCollection = client.db("database").collection("product");
        const usersCollection = client.db("database").collection("users");
        const ordersCollection = client.db("database").collection("orders");

        app.post('/products', verifyJWT, async (req, res) => {
            const data = req.body;
            const result = await productsCollection.insertOne(data);
            res.send(result);
        })

        app.get('/products', async (req, res) => {
            const result = await productsCollection.find({}).toArray()
            res.send(result)
        })
        app.get('/products/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: ObjectId(id) }
            const result = await productsCollection.findOne(filter)
            res.send(result)
        })

        app.put('/users/:email', async (req, res) => {
            const doc = req.body;
            const email = req.params.email;
            const filter = { email: email };
            const options = { upsert: true };
            const updateDoc = {
                $set: doc,
            };
            const result = await usersCollection.updateOne(filter, updateDoc, options);
            const access = jwt.sign({ email: email }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1d' })
            res.send({ result, access });
        })

        app.get('/users', verifyJWT, async (req, res) => {
            const result = await usersCollection.find({}).toArray()
            res.send(result)
        })
        app.get('/users/:email', async (req, res) => {
            const email = req.params.email;
            const result = await usersCollection.findOne({ email: email })
            res.send(result)
        })

        app.patch('/users/:email', async (req, res) => {
            const email = req.params.email;
            const filter = { email: email };
            const updateDoc = {
                $set: {
                    role: 'admin'
                },
            };
            const result = await usersCollection.updateOne(filter, updateDoc);
            res.send(result);
        })

        app.post('/orders', verifyJWT, async (req, res) => {
            const document = req.body;
            const result = await ordersCollection.insertOne(document);
            res.send(result);
        })
        app.get('/orders/:email', verifyJWT, async (req, res) => {
            const email = req.params.email;
            const query = { email: email };
            const data = await ordersCollection.find(query).toArray();
            res.send(data);
        })

        app.delete('/orders/:id', verifyJWT, async (req, res) => {
            const id = req.params.id;
            const filter = { _id: ObjectId(id) }
            const result = await ordersCollection.deleteOne(filter)
            res.send(result)
        })

        app.get('/orders/search/:id', verifyJWT, async (req, res) => {
            const id = req.params.id;
            const filter = { _id: ObjectId(id) };
            const result = await ordersCollection.findOne(filter);
            res.send(result);
        })

        app.post('/create-payment-intent', verifyJWT, async (req, res) => {
            const { totalAmount } = req.body;
            const amount = totalAmount * 100;
            const paymentIntent = await stripe.paymentIntents.create({
                amount: amount,
                currency: 'usd',
                payment_method_types: ['card']
            })
            res.send({ clientSecret: paymentIntent.client_secret, })
        })

        app.patch('/order/transaction/:id', verifyJWT, async (req, res) => {
            const id = req.params.id;
            const { transactionId } = req.body;
            const filter = { _id: ObjectId(id) };
            const updateDoc = {
                $set: {
                    transactionId: transactionId,
                    paid: 'pending'
                },
            };
            const result = await ordersCollection.updateOne(filter, updateDoc);
            res.send(result);
        })

    }
    finally {

    }
}

run().catch(console.dir);

app.get('/', (req, res) => {
    res.send("server is running")
})

app.listen(port, () => {
    console.log('running this server with ' + port);
})