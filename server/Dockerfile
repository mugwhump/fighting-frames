FROM node:16-alpine

# Create app directory
WORKDIR /usr/src/app

# Install app dependencies
# A wildcard is used to ensure both package.json AND package-lock.json are copied
# where available (npm@5+)
COPY package*.json ./

RUN npm install
# If you are building your code for production
# RUN npm ci --only=production

# Bundle app source, ignores stuff in .dockerignore
# Doesn't copy mounted directories. Need contents of dist and... modules? No, that's covered via npm install above.
# When publishing change to server codebase, it's the image that's built and deployed
COPY . .

EXPOSE 3000
# dev uses nodemon, reloads server upon filechanges (mapped to volume)
# start runs with node. 
# Use a less-privileged user instead of root
USER node
# TODO: remove from here and add to compose file?
CMD [ "npm", "run", "dev" ]
