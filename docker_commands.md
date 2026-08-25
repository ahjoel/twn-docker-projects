# commands

# create docker network
docker network create mongo-network

## start mongodb
```
docker run -d \
-p 27017:27017 \
-e MONGO_INITDB_ROOT_USERNAME=admin \
-e MONGO_INITDB_ROOT_PASSWORD=password \
--net mongo-network \
--name mongodb \
mongo
```

## start mongo-express
```
docker run -d \
-p 8081:8081 \
-e ME_CONFIG_MONGODB_URL=mongodb://admin:password@mongodb:27017 \
-e ME_CONFIG_BASICAUTH_USERNAME=user \
-e ME_CONFIG_BASICAUTH_PASSWORD=pass \
--net mongo-network \
--name mongo-express \
techworldwithnana/mongo-express
```