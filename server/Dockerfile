FROM node:16-alpine

# Create app directory
WORKDIR /usr/src/app

# Install app dependencies
# A wildcard is used to ensure both package.json AND package-lock.json are copied
# where available (npm@5+)
COPY package*.json ./

#RUN npm install
# Always Clean Install prod dependencies, because this whole folder gets mounted over if in dev
RUN npm ci --only=production

# Bundle app source, ignores stuff in .dockerignore
COPY . .

# Build for prod. Should be fine if it runs on dev too.
RUN npm run build

EXPOSE 3000
# create node log folder first so that node user ownership will be preserved in mounted volume
RUN mkdir log
# give node user ownership
RUN chown -R node.node /usr/src/app
# Use a less-privileged user instead of root
USER node
