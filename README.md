# raven

A sanity-inducing tool for any Google Workspace.

# basic commands

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
