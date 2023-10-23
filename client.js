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
    this.eventEmitter.on('updateBook', async () => {
      await this.syncBookWithRetry();
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

  async syncBook() {
    try {
      const book = JSON.stringify(this.orderBook.getBook());

      this.peer.request('sync_book', book, (err, result) => {
        if (err) {
          console.error('Erro durante a sincronização:', err);
          this.retrySyncBook();
          return;
        }

        if (result) {
          this.syncedBook(result)
        }
      });
    } catch (err) {
      console.error('Erro durante a sincronização:', err);
      this.retrySyncBook();
    }
  }

  async retrySyncBook() {
    const retryInterval = 5000;

    setTimeout(() => {
      this.syncBook();
    }, retryInterval);
  }

  async syncBookWithRetry() {
    this.syncBook();
  }

  async stop() {
    if (this.peer) this.peer.stop();
    if (this.link) this.link.stop();
  }
}


const serverPort = process.argv[2] || '30001'
console.log(`Client started on port ${serverPort}`)

const client = new Client(`http://127.0.0.1:${serverPort}`);

client.orderBook.addOrder("BTC-USD", "bid", 10, 10);
client.orderBook.addOrder("BTC-USD", "bid", 10, 50);
client.orderBook.addOrder("BTC-USD", "ask", 10, 10);
client.orderBook.removeOrder("BTC-USD", "bid", 10, 10);

console.log(client.orderBook.getDepth("BTC-USD"))