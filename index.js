const express = require('express');
const app = express();
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config()
const stripe = require('stripe')(process.env.PAYMENT_SECRET_KEY)


const port = process.env.PORT || 5000;

// middleware
const corsOptions ={
  origin:'*', 
  credentials:true,
  optionSuccessStatus:200,
}
app.use(cors(corsOptions));
app.use(express.json());

const verifyJWT = (req, res, next) => {
  const authorization = req.headers.authorization;
  if (!authorization) {
    return res.status(401).send({ error: true, message: 'unauthorized access' });
  }
  // bearer token use
  const token = authorization.split(' ')[1];
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).send({ error: true, message: 'unauthorized access' })
    }
    req.decoded = decoded;
    next();
  })
}



const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
// const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.lvcap8y.mongodb.net/?retryWrites=true&w=majority`;
var uri = `mongodb://${process.env.DB_USER}:${process.env.DB_PASS}@ac-ytdlcug-shard-00-00.lvcap8y.mongodb.net:27017,ac-ytdlcug-shard-00-01.lvcap8y.mongodb.net:27017,ac-ytdlcug-shard-00-02.lvcap8y.mongodb.net:27017/?ssl=true&replicaSet=atlas-j6c9nb-shard-0&authSource=admin&retryWrites=true&w=majority`;

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
    await client.connect();
    // Send a ping to confirm a successful connection
    const usersCollection = client.db("danceDb").collection("users");
    const classCollection = client.db("classDb").collection("class");
    const feedbackCollection = client.db('feedDb').collection('feedback')
    const enrolledCollection=client.db('classDb').collection('enrolled')
    const paymentCollection = client.db("classDb").collection("payments");

    app.post('/jwt', (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1hr' })
      res.send({ token })
    })

    const verifyAdmin = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { email: email }
      const user = await usersCollection.findOne(query);
      if (user?.role !== 'admin') {
        return res.status(403).send({ error: true, message: 'porbidden message' });
      }
      next();
    }

    // instructor
    app.get('/instructors', async (req, res) => {
      const query = {role:'instructor'}
      const result = await usersCollection.find(query).toArray();
      res.send(result);
    });

    // users
    app.get('/users', verifyJWT, verifyAdmin, async (req, res) => {
      const result = await usersCollection.find().toArray();
      res.send(result);
    });
    // user post
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
    // for get admin email
    app.get('/users/admin/:email', verifyJWT, async (req, res) => {
      const email = req.params.email;
      if (req.decoded.email !== email) {
        res.send({ admin: false })
      }
      const query = { email: email }
      const user = await usersCollection.findOne(query);
      const result = { admin: user?.role === 'admin' }
      res.send(result);
    })
    // role
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
    app.get('/users/instructor/:email', verifyJWT, async (req, res) => {
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
    // student
    app.get('/users/student/:email', verifyJWT, async (req, res) => {
      const email = req.params.email;
      if (req.decoded.email !== email) {
        res.send({ student: false })
      }
      const query = { email: email }
      const user = await usersCollection.findOne(query);
      const result = { student: user?.role === 'student' }
      res.send(result);
    })
// for get student id
 app.patch('/users/student/:id', async (req, res) => {
      const id = req.params.id;
      console.log(id);
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          role: 'student'
        },
      };
      const result = await usersCollection.updateOne(filter, updateDoc);
      res.send(result);
    })
    // approved api
    app.patch('/class/approved/:id', async (req, res) => {
      const id = req.params.id;
      console.log(id);
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          role: 'approved'
        },
      };
      const result = await classCollection.updateOne(filter, updateDoc);
      res.send(result);
    })
    app.patch('/class/denied/:id', async (req, res) => {
      const id = req.params.id;
      console.log(id);
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          role: 'denied'
        },
      };
      const result = await classCollection.updateOne(filter, updateDoc);
      res.send(result);
    })
    // class api
    app.post('/classes', verifyJWT, async (req, res) => {
      const newItem = req.body;
      const result = await classCollection.insertOne(newItem)
      res.send(result);
    })
    // for pay
    app.get('/classes/:email', async (req, res) => {
      const email=req.params.email;
      const query={ email :{ $eq:email}};
      console.log(email)
       const result = await classCollection.find(query).toArray()
       res.send(result);
     });
    // enrooled students data
   
    app.post('/enrolled', async (req, res) => {
      const newItem = req.body;
      const result = await enrolledCollection.insertOne(newItem)
      res.send(result);
    })
    app.get('/enrolled',async (req, res) => {
      const result = await enrolledCollection.find().toArray();
      res.send(result);
    });
    // mayselection
    app.get('/enrolled/selected/:email', async (req, res) => {
     const email=req.params.email;
     const query={ email :{ $eq:email}};
     console.log(email)
      const result = await enrolledCollection.find(query).limit(6).toArray()
      res.send(result);
    });
    // 
    
    app.get('/class', async (req, res) => {
      const result = await classCollection.find().toArray();
      res.send(result);
    });
    app.get('/classes', async (req, res) => {
      const query = {role: 'approved'}
      const result = await classCollection.find(query).toArray();
      res.send(result);
    })
    // feedback
    app.post('/feedback',  async (req, res) => {
      const feed= req.body;
      const result = await feedbackCollection.insertOne(feed)
      res.send(result);
    })
    app.get('/feedback', async (req, res) => {
      const query={status:'denied'}
      const result = await feedbackCollection.find(query).toArray();
      res.send(result);
    })
    // student data find
    // delete
    app.delete('/enrolled/selected/:id', verifyJWT, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const result = await enrolledCollection.deleteOne(query);
      res.send(result);
    })
    
    //selected
    // create payment intent
    app.post('/create-payment-intent', verifyJWT, async (req, res) => {
      const { price } = req.body;
      const amount = parseInt(price * 100);
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: 'usd',
        payment_method_types: ['card']
      });
      res.send({
        clientSecret: paymentIntent.client_secret
      })
    })
    
  //  payment insert in database
    app.post('/payments',async(req,res)=>{
      const payment=req.body;
      console.log({payment})
      const result=await paymentCollection.insertOne(payment);
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
