const express = require('express');
const app = express();
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config()

const port = process.env.PORT || 5000;
// middleware
app.use(cors());
app.use(express.json());


const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.lvcap8y.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();
    // Send a ping to confirm a successful connection
    const usersCollection = client.db("danceDb").collection("users");
    // users
    app.get('/users', async (req, res) => {
        const result = await usersCollection.find().toArray();
        res.send(result);
      });
      app.post('/users', async (req, res) => {
        const user = req.body;
        const query = { email: user.email }
        const existingUser = await usersCollection.findOne(query);
        if (existingUser) {
          return res.send({ message: 'user already exists' })
        }
        const result = await usersCollection.insertOne(user);
        res.send(result);
      });
      app.get('/users/admin/:email', async (req, res) => {
        const email = req.params.email;
        if (req.decoded.email !== email) {
          res.send({ admin: false })
        }
        const query = { email: email }
        const user = await usersCollection.findOne(query);
        const result = { admin: user?.role === 'admin' }
        res.send(result);
      })
      app.patch('/users/admin/:id', async (req, res) => {
        const id = req.params.id;
        console.log(id);
        const filter = { _id: new ObjectId(id) };
        const updateDoc = {
          $set: {
            role: 'admin'
          },
        };
        const result = await usersCollection.updateOne(filter, updateDoc);
        res.send(result);
      })
      // instructor
      app.get('/users/instructor/:email', async (req, res) => {
        const email = req.params.email;
        if (req.decoded.email !== email) {
          res.send({ instructor: false })
        }
        const query = { email: email }
        const user = await usersCollection.findOne(query);
        const result = { instructor: user?.role === 'instructor' }
        res.send(result);
      })
      app.patch('/users/instructor/:id', async (req, res) => {
        const id = req.params.id;
        console.log(id);
        const filter = { _id: new ObjectId(id) };
        const updateDoc = {
          $set: {
            role: 'instructor'
          },
        };
        const result = await usersCollection.updateOne(filter, updateDoc);
        res.send(result);
      })


    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);




app.get('/', (req, res) => {
    res.send('smooth moves')
  })
  app.listen(port, () => {
    console.log(`dancing girl sitting on port ${port}`);
  })
  