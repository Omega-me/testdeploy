# Use an official Node.js runtime as a parent image
FROM node:18

# Set the working directory to /app
WORKDIR /app

# Copy package.json and package-lock.json to /app
COPY package*.json ./

# Install app dependencies
RUN npm install

# Copy the rest of the application code to /app
COPY . .


# Install PM2 globally
RUN npm install pm2 -g

# Expose the port on which the app will run
EXPOSE 3333

# Start the app with PM2
CMD ["pm2-runtime", "start", "index.js"]