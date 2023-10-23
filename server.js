'use strict'

const { PeerRPCServer } = require('grenache-nodejs-http');
const Link = require('grenache-nodejs-link');
const OrderBook = require('./orderbook');
const EventEmitter = require('events');

const pairs = ['BTC-USD'];

class Server {
  constructor(grapeUrl) {
    this.grapeUrl = grapeUrl;
    this.servicePort = Math.floor(Math.random() * (3033 - 3030 + 1)) + 3030
    this.link = null;
    this.peer = null;
    this.eventEmitter = new EventEmitter();
    this.orderBook = new OrderBook(pairs, null);

    this.eventEmitter.once('ready', async () =>{
      console.log('Link Announced!')
    });
  }

  syncBook(payload) {
    if (!payload) return JSON.stringify({ bid: this.orderBook.bid, ask: this.orderBook.ask });

    this.orderBook.isSynced = false

    const book = JSON.parse(payload)
    this.orderBook.update(book);
    const { bid, ask } = this.orderBook;
    return JSON.stringify({ bid, ask }); 
  }

  start() {
    this.link = new Link({
      grape: this.grapeUrl,
    });
    this.link.start();

    this.peer = new PeerRPCServer(this.link, { timeout: 100000 });
    this.peer.init();

    const service = this.peer.transport('server');
    service.listen(this.servicePort);

    setInterval(() => {
      this.link.announce('sync_book', service.port, {});
      // this.eventEmitter.emit('ready');
    }, 1000);   

    service.on('request', (rid, key, payload, handler) => {
      try {
          const result = this.syncBook(payload);
          handler.reply(null, result);
      } catch (err) {
        console.error('An error occurred during the sync', err);
        handler.reply(err);
      }
    });
  }

  stop() {
    if (this.peer) this.peer.stop();
    if (this.link) this.link.stop();
  }
}

const serverPort = process.argv[2] || '30001'
console.log(`Server started on port ${serverPort}`)

const server = new Server(`http://127.0.0.1:${serverPort}`);
server.start();
