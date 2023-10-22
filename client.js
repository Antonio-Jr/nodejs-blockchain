'use strict'

const { PeerRPCClient } = require('grenache-nodejs-http');
const Link = require('grenache-nodejs-link');
const OrderBook = require('./orderbook');

const pairs = ['BTC-USD']

class Client {
  constructor(grapeUrl) {
    this.link = new Link({ grape: grapeUrl });
    this.link.start();
    this.orderBook = new OrderBook(pairs);
    this.peer = new PeerRPCClient(this.link, {});
    this.peer.init();
    this.syncBookWithRetry(); // Inicialize a sincronização com tentativas
  }

  async syncBook() {
    try {
      const book = JSON.stringify(this.orderBook.getBook());

      this.peer.request('sync_book', book, (err, result) => {
        if (err) {
          console.error('Erro durante a sincronização:', err);
          this.retrySyncBook(); // Inicie uma nova tentativa de sincronização
          return;
        }

        if (result) {
          const { ask, bid } = JSON.parse(result);
          this.orderBook.bid = bid;
          this.orderBook.ask = ask;
        }
      });
    } catch (err) {
      console.error('Erro durante a sincronização:', err);
      this.retrySyncBook(); // Inicie uma nova tentativa de sincronização
    }
  }

  async retrySyncBook() {
    const retryInterval = 5000; // Tempo de espera entre tentativas (5 segundos)

    setTimeout(() => {
      this.syncBook(); // Tente a sincronização novamente após o intervalo
    }, retryInterval);
  }

  async syncBookWithRetry() {
    this.syncBook(); // Inicialize a sincronização
  }

  async stop() {
    if (this.peer) this.peer.stop();
    if (this.link) this.link.stop();
  }
}



const client = new Client('http://127.0.0.1:30001');
client.syncBook();
console.log(client.orderBook.getDepth("BTC-USD"));

console.log(client.orderBook)

client.orderBook.addOrder("BTC-USD", "bid", 10, 10);

client.orderBook.addOrder("BTC-USD", "bid", 10, 50);
client.syncBook();

client.orderBook.addOrder("BTC-USD", "ask", 10, 10);
client.syncBook();

client.syncBook();
console.log(client.orderBook.getBestPrice("BTC-USD", "bid"));

client.syncBook();
console.log(client.orderBook.getBestPrice("BTC-USD", "ask"));

client.syncBook();
client.orderBook.removeOrder("BTC-USD", "bid", 10, 10);

client.syncBook();
console.log(client.orderBook.getDepth("BTC-USD"));