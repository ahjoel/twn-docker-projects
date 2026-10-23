let express = require('express');
let path = require('path');
let fs = require('fs');
let MongoClient = require('mongodb').MongoClient;
let bodyParser = require('body-parser');
let app = express();

app.use(bodyParser.urlencoded({
  extended: true
}));
app.use(bodyParser.json());

app.get('/', function (req, res) {
    res.sendFile(path.join(__dirname, "index.html"));
  });

app.get('/profile-picture', function (req, res) {
  let img = fs.readFileSync(path.join(__dirname, "images/profile-1.jpg"));
  res.writeHead(200, {'Content-Type': 'image/jpg' });
  res.end(img, 'binary');
});

// use when starting application locally with node command
let mongoUrlLocal = "mongodb://admin:password@localhost:27017";

// use when starting application as docker container, part of docker-compose
let mongoUrlDockerCompose = "mongodb://admin:password@mongodb";

// "user-account" in demo with docker
let databaseName = "user-account";
let collectionName = "users";

app.get('/get-profile', async function (req, res) {
  let response = {};
  // Connect to the db using local application or docker compose variable in connection properties
  let client = await MongoClient.connect(mongoUrlDockerCompose);

  let db = client.db(databaseName);

  let myquery = { userid: 1 };

  response = await db.collection(collectionName).findOne(myquery);
  await client.close();

  // Send response
  res.send(response ? response : {});
});

app.post('/update-profile', async function (req, res) {
  let userObj = req.body;
  // Connect to the db using local application or docker compose variable in connection properties
  let client = await MongoClient.connect(mongoUrlDockerCompose);

  let db = client.db(databaseName);
  userObj['userid'] = 1;

  let myquery = { userid: 1 };
  let newvalues = { $set: userObj };

  await db.collection(collectionName).updateOne(myquery, newvalues, {upsert: true});
  await client.close();

  // Send response
  res.send(userObj);
});

app.listen(3000, function () {
  console.log("app listening on port 3000!");
});