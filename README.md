# raven

A sanity-inducing tool for any Google Workspace.

# basic cloudflare commands

```
// log into cloudflare
/usr/local/bin/cloudflared login

// list all cloudflare tunnels
/usr/local/bin/cloudflared tunnel list

// define a tunnel called "raven" which will be exposed via "raven.neuron9.io"
/usr/local/bin/cloudflared tunnel route dns raven raven.neuron9.io

/*
/** to start the Cloudflare tunnel **/
 */
// 1. start your server
npm run dev

// 2. in a different terminal window...
/usr/local/bin/cloudflared tunnel run raven

// ...or, to run in debug mode:
/usr/local/bin/cloudflared tunnel --loglevel debug run raven
```

# basic docker commands

```
// Start MongoDB from the project root folder
docker-compose up -d      s// -d runs it in the background

// check logs
docker-compose logs -f mongo

// stop the container
docker-compose down
```

# color scheme

```
Background:         #1C232D
Surface / cards:    #273142
Borders / dividers: #3A4556

Primary text:       #E6EDF3
Secondary text:     #B8C0CC
Muted text:         #8A94A6

Primary accent:     #22D3EE
Secondary accent:   #F97316
```

# mongodb

```
// make sure the mongo service is running
brew services start mongodb-community

// restart the service (if you have to)
brew services restart mongodb-community

// verify it's running
mongosh

```
