const { PeerRPCClient } = require('grenache-nodejs-http');
const Link = require('grenache-nodejs-link');
const OrderBook = require('./orderbook');

const pairs = ['BTC-USD']

class Client {
  constructor(grapeUrl) {
    this.link = new Link({ grape: grapeUrl, requestTimeout: 10000 });
    this.peer = new PeerRPCClient(this.link, {});
    this.orderBook = new OrderBook(pairs)
    this.link.start();
    this.peer.init();
    this.syncBook();
  }

  async syncBook(){
    const book = this.orderBook.getBook();
    this.peer.request('syncBook', book, { timeout: 100000 }, (err, result) => {
      if(err){
        throw err;
      }
      const { ask, bid } = result;
      client.orderBook.bid = bid;
      client.orderBook.ask = ask;
    })
  }

  async stop() {
    if (this.peer) this.peer.stop();
    if (this.link) this.link.stop();
  }
}

const client = new Client('http://127.0.0.1:30001');

client.orderBook.addOrder("BTC-USD", "bid", 10000, 10);
client.syncBook();

client.orderBook.addOrder("BTC-USD", "bid", 10000, 50);
client.syncBook();

client.orderBook.addOrder("BTC-USD", "ask", 10000, 10);
client.syncBook();

client.syncBook();
console.log(client.orderBook.getBestBid("BTC-USD"));

client.syncBook();
console.log(client.orderBook.getBestAsk("BTC-USD"));

client.syncBook();
client.orderBook.removeOrder("BTC-USD", "bid", 10000, 10);

client.syncBook();
console.log(client.orderBook.getDepth("BTC-USD"));