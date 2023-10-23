'use strict'

const { PeerRPCClient } = require('grenache-nodejs-http');
const Link = require('grenache-nodejs-link');
const OrderBook = require('./orderbook');
const EventEmitter = require('events');

const pairs = ['BTC-USD']

class Client {
  constructor(grapeUrl) {
    this.eventEmitter = new EventEmitter();
    this.link = new Link({ grape: grapeUrl });
    this.link.start();
    
    this.peer = new PeerRPCClient(this.link, { timeout: 100000 });
    this.peer.init();
    this.orderBook = new OrderBook(pairs, this.eventEmitter);
    this.eventEmitter.on('updateBook', async (data) => {
        await this.syncBookWithRetry(JSON.stringify(data));
    })
  }

  syncedBook(book){
    const { ask, bid } = JSON.parse(book);
    if(Object.keys(ask).length === 0 && Object.keys(bid).length === 0) return;

    this.orderBook.bid = bid;
    this.orderBook.ask = ask;

    for(const pair of this.orderBook.pairs){
      
      console.log([pair], this.orderBook.getDepth(pair))
    }

    console.log('Book updated successfully!')
  }

  async syncBook(data) {
    try {
      this.peer.request('sync_book', data, (err, result) => {
        if (err) {
          console.error('An error occurred during the sync:', err);
          this.retrySyncBook(data);
          return;
        }

        if (result) {
          this.syncedBook(result)
        }
      });
    } catch (err) {
      console.error('An error occurred during the sync:', err);
      this.retrySyncBook(data);
    }
  }

  async retrySyncBook(data) {
    const retryInterval = 5000;

    setTimeout(() => {
      this.syncBook(data);
    }, retryInterval);
  }

  async syncBookWithRetry(data) {
    this.syncBook(data);
  }

  async stop() {
    if (this.peer) this.peer.stop();
    if (this.link) this.link.stop();
  }
}


const serverPort = process.argv[2] || '30001'
console.log(`Client started on port ${serverPort}`)

const client = new Client(`http://127.0.0.1:${serverPort}`);

client.orderBook.addOrder("BTC-USD", "bid", 25, 100);
client.orderBook.addOrder("BTC-USD", "bid", 10, 10);
client.orderBook.addOrder("BTC-USD", "bid", 10, 50);
client.orderBook.addOrder("BTC-USD", "ask", 105, 100);
client.orderBook.removeOrder("BTC-USD", "bid", 25, 100);

console.log(client.orderBook.getDepth("BTC-USD"))