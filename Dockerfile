FROM node:24-alpine

# set variable environments
ENV MONGO_DB_USERNAME=admin \
    MONGO_DB_PWD=password

# create folder and -p as parents, will create directory if not exists
RUN mkdir -p /home/app

#copy all files on ./app to container folder /home/app
COPY ./app /home/app

# set default folder where the command will run
WORKDIR /home/app

# install dependencies
RUN npm install

CMD ["node", "server.js"]

#create image and set the name with and with . it will search Dockerfile
# docker build -t my-app:1.0 .

# Run the docker container
# docker run my-app:1.0

# Access the container
# docker exec -it container-id /bin/bash or /bin/sh