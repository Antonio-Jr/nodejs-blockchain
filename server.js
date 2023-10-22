'use strict'

const { PeerRPCServer } = require('grenache-nodejs-http');
const Link = require('grenache-nodejs-link');
const OrderBook = require('./orderbook');

const pairs = ['BTC-USD'];

class Server {
  constructor(grapeUrl) {
    this.grapeUrl = grapeUrl;
    this.servicePort = Math.floor(Math.random() * (3090 - 3030 + 1)) + 3030
    this.link = null;
    this.peer = null;
    this.orderBook = new OrderBook(pairs);
  }

  syncBook(payload) {
    if (!payload) return JSON.stringify({ bid: this.orderBook.bid, ask: this.orderBook.ask });

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

    this.peer = new PeerRPCServer(this.link);
    this.peer.init();

    const service = this.peer.transport('server');
    service.listen(this.servicePort);

    setInterval(() => {
      this.link.announce('sync_book', service.port, {});
    }, 10000);

    service.on('request', (rid, key, payload, handler) => {
      // try {
        const result = this.syncBook(payload);
        this.syncServerBook()
        handler.reply(rid, result);
      // } catch (err) {
      //   console.error('Erro durante a sincronização do livro:', err);
      //   handler.reply(err);
      // }
    });
  }

  async syncServerBook() {
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
      this.syncServerBook(); // Tente a sincronização novamente após o intervalo
    }, retryInterval);
  }

  async syncBookWithRetry() {
    this.syncServerBook(); // Inicialize a sincronização
  }

  stop() {
    if (this.peer) this.peer.stop();
    if (this.link) this.link.stop();
  }
}

const server = new Server('http://127.0.0.1:30001');
server.start();
