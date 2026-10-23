# Docker Project – Node.js + MongoDB App

Demo application (module 07 – Docker of the TechWorld with Nana DevOps bootcamp): a user profile page
whose data is stored in MongoDB. The project shows how to:

- run containers manually with `docker run` and a Docker network;
- orchestrate several containers with **Docker Compose**;
- persist data with **Docker volumes**;
- build the application image with a **Dockerfile**;
- push that image to a private registry (**Nexus**) and pull it back for deployment.

---

## Table of contents

1. [Architecture](#architecture)
2. [Project structure](#project-structure)
3. [Prerequisites](#prerequisites)
4. [Option 1 – Plain Docker](#option-1--plain-docker)
5. [Option 2 – Docker Compose](#option-2--docker-compose)
6. [Build the application image](#build-the-application-image)
7. [Push the image to Nexus](#push-the-image-to-nexus)
8. [The `mongo-*.yaml` Compose files](#the-mongo-yaml-compose-files)
9. [Application API](#application-api)
10. [MongoDB connection: local vs container](#mongodb-connection-local-vs-container)
11. [Useful commands](#useful-commands)
12. [Troubleshooting](#troubleshooting)

---

## Architecture

```
              Browser
       ┌────────┴─────────┐
       │ :3000            │ :8081
┌──────▼───────┐   ┌──────▼────────┐
│   my-app     │   │ mongo-express │   (web admin UI)
│ Node/Express │   └──────┬────────┘
└──────┬───────┘          │
       │ mongodb://admin:password@mongodb:27017
       └─────────┬────────┘
          ┌──────▼──────┐
          │   mongodb   │ :27017 ──► volume mongo-data (/data/db)
          └─────────────┘
```

| Service         | Image                                | Port  | Role                                 |
|-----------------|--------------------------------------|-------|--------------------------------------|
| `my-app`        | built from the `Dockerfile`          | 3000  | HTML/JS frontend + Express backend   |
| `mongodb`       | `mongo`                              | 27017 | Database                             |
| `mongo-express` | `techworldwithnana/mongo-express`    | 8081  | Web UI to manage MongoDB             |

Containers defined in the same Compose file share a network: they reach each other **by service name**
(e.g. `mongodb`), not via `localhost`.

---

## Project structure

```
.
├── app/
│   ├── index.html          # Profile page (HTML + CSS + vanilla JS)
│   ├── server.js           # Express server + MongoDB access
│   ├── package.json        # Dependencies: express, mongodb, body-parser
│   └── images/             # Profile pictures
├── Dockerfile              # Application image (node:24-alpine)
├── Dockerfile-ok           # Reference version of the Dockerfile
├── docker-compose.yaml     # mongodb + mongo-express with a persistent volume
├── mongo-1.yaml            # Compose: mongodb + mongo-express, no volume
├── mongo-2.yaml            # Compose: + my-app from Nexus, no volume
├── mongo-3.yaml            # Compose: + my-app from Nexus, with volume
└── docker_commands.md      # docker run cheat sheet
```

---

## Prerequisites

- [Docker](https://docs.docker.com/get-docker/) (includes Docker Compose v2: `docker compose`)
- [Node.js](https://nodejs.org/) 24+ and npm — only needed to run the app outside a container

---

## Option 1 – Plain Docker

**1. Create a Docker network** so containers can talk to each other by name:

```bash
docker network create mongo-network
```

**2. Start MongoDB:**

```bash
docker run -d \
  -p 27017:27017 \
  -e MONGO_INITDB_ROOT_USERNAME=admin \
  -e MONGO_INITDB_ROOT_PASSWORD=password \
  --net mongo-network \
  --name mongodb \
  mongo
```

**3. Start mongo-express:**

```bash
docker run -d \
  -p 8081:8081 \
  -e ME_CONFIG_MONGODB_URL=mongodb://admin:password@mongodb:27017 \
  -e ME_CONFIG_BASICAUTH_USERNAME=user \
  -e ME_CONFIG_BASICAUTH_PASSWORD=pass \
  --net mongo-network \
  --name mongo-express \
  techworldwithnana/mongo-express
```

**4. Open mongo-express** at <http://localhost:8081> (credentials: `user` / `pass`).

**5. Create the `user-account` database and the `users` collection** in the mongo-express UI.

**6. Run the Node.js app locally:**

```bash
cd app
npm install
node server.js
```

> ⚠️ When running locally, the app must use `mongoUrlLocal` (see
> [MongoDB connection](#mongodb-connection-local-vs-container)).

**7. Open the app** at <http://localhost:3000>.

---

## Option 2 – Docker Compose

**1. Start MongoDB and mongo-express:**

```bash
docker compose -f docker-compose.yaml up -d
```

**2.** In mongo-express (<http://localhost:8081>, `user` / `pass`), create the **`user-account`** database
and then the **`users`** collection.

**3. Run the app:**

```bash
cd app
npm install
node server.js
```

**4. Open** <http://localhost:3000>.

**Stop the environment:**

```bash
docker compose -f docker-compose.yaml down       # keeps the volume (data)
docker compose -f docker-compose.yaml down -v    # also removes the volume
```

---

## Build the application image

The `Dockerfile`:

```dockerfile
FROM node:24-alpine

ENV MONGO_DB_USERNAME=admin \
    MONGO_DB_PWD=password

RUN mkdir -p /home/app
COPY ./app /home/app
WORKDIR /home/app      # following commands run in /home/app
RUN npm install
CMD ["node", "server.js"]
```

Build and run:

```bash
docker build -t my-app:1.0 .            # "." is the folder containing the Dockerfile
docker run -d -p 3000:3000 --net mongo-network --name my-app my-app:1.0
docker exec -it my-app /bin/sh          # open a shell in the container (alpine: sh, not bash)
```

---

## Push the image to Nexus

A private Docker repository is hosted on Nexus at `164.92.192.39:8083`.

**1. Allow the (insecure) HTTP registry** in the Docker daemon configuration
(Docker Desktop → *Settings* → *Docker Engine*, or `/etc/docker/daemon.json`):

```json
{
  "insecure-registries": ["164.92.192.39:8083"]
}
```

**2. Log in, tag and push:**

```bash
docker login 164.92.192.39:8083
docker tag my-app:1.0 164.92.192.39:8083/my-app:1.0
docker push 164.92.192.39:8083/my-app:1.0
```

> On an Apple Silicon Mac, build for the target server architecture:
> `docker build --platform linux/amd64 -t my-app:1.0 .`

---

## The `mongo-*.yaml` Compose files

These files show the configuration evolving step by step:

| File           | my-app (Nexus) | mongodb | mongo-express | Volume | Note                                              |
|----------------|:--------------:|:-------:|:-------------:|:------:|---------------------------------------------------|
| `mongo-1.yaml` |       –        |    ✅    |       ✅       |   ❌    | Data is lost when the container is removed        |
| `mongo-2.yaml` |       ✅        |    ✅    |       ✅       |   ❌    | Full application, still no persistence            |
| `mongo-3.yaml` |       ✅        |    ✅    |       ✅       |   ✅    | **Final version**: data persisted in `mongo-data` |

Full deployment (on the server, after `docker login` to Nexus):

```bash
docker compose -f mongo-3.yaml up -d
```

The named volume `mongo-data` is mounted on `/data/db` (MongoDB's storage directory), so data survives
a `docker compose down` / `up`.

---

## Application API

| Method | Route              | Description                                                  |
|--------|--------------------|--------------------------------------------------------------|
| `GET`  | `/`                | Serves `index.html`                                          |
| `GET`  | `/profile-picture` | Returns `images/profile-1.jpg`                               |
| `GET`  | `/get-profile`     | Reads the profile (`userid: 1`) from `user-account.users`    |
| `POST` | `/update-profile`  | Creates or updates the profile (upsert) with the JSON body   |

Example:

```bash
curl -X POST http://localhost:3000/update-profile \
  -H "Content-Type: application/json" \
  -d '{"name":"Joel","email":"joel@example.com","interests":"DevOps"}'

curl http://localhost:3000/get-profile
```

---

## MongoDB connection: local vs container

`app/server.js` defines two connection URLs:

```js
// app started locally with `node server.js`
let mongoUrlLocal = "mongodb://admin:password@localhost:27017";

// app running as a container, on the same network as mongodb
let mongoUrlDockerCompose = "mongodb://admin:password@mongodb";
```

The code currently uses **`mongoUrlDockerCompose`** (Compose deployment). To run the app with
`node server.js` on your machine, switch it to `mongoUrlLocal` in `MongoClient.connect(...)`.

---

## Useful commands

```bash
docker ps                          # running containers
docker ps -a                       # all containers
docker logs -f <container>         # follow logs
docker images                      # local images
docker network ls                  # networks
docker volume ls                   # volumes
docker stop <container> && docker rm <container>
docker compose -f <file>.yaml logs -f
```

---

## Troubleshooting

| Problem | Likely cause / fix |
|---------|--------------------|
| `MongoServerSelectionError` / `ECONNREFUSED` | Wrong URL: use `localhost` outside a container, `mongodb` inside one. Make sure mongodb is running. |
| mongo-express keeps restarting | MongoDB isn't ready yet; `restart: always` restarts it until the connection succeeds. |
| Data disappears | The Compose file has no volume (`mongo-1.yaml`, `mongo-2.yaml`) → use `mongo-3.yaml`. |
| `http: server gave HTTP response to HTTPS client` on push | Add the Nexus registry to `insecure-registries`. |
| `exec format error` on the server | Image built for arm64 (M1/M2 Mac…) → rebuild with `--platform linux/amd64`. |

---

> **Security:** the credentials (`admin` / `password`, `user` / `pass`) are intentionally simple for the
> demo. In a real project, use environment variables, an untracked `.env` file, or *Docker secrets*.
