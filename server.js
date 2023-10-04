const { PeerRPCServer } = require('grenache-nodejs-http')
const Link = require('grenache-nodejs-link');
const OrderBook = require('./orderbook');

const pairs = ['BTC-USD']

class Server {
  constructor(grapeUrl) {
    this.grapeUrl = grapeUrl;
    this.servicePort = 1337;
    this.link = null;
    this.peer = null;
    this.orderBook = new OrderBook(pairs)
    this.services = {}
  }

  syncBook(book) {
    this.orderBook.update(book);
    const { bid, ask } = this.orderBook;
    return { bid, ask }
  }

  start() {
    this.link = new Link({
      grape: this.grapeUrl
    });
    this.link.start();

    this.peer = new PeerRPCServer(this.link, {});
    this.peer.init();

    const service = this.peer.transport('server');
    service.listen(this.servicePort);

    setInterval(() => {
      this.link.announce('syncBook', service.port, {})
    }, 1000)

    service.on('request', (rid, key, payload, handler) => {
      const result = this.syncBook(payload)
      handler.reply(null, result);
    });
  }

  stop(){
    if (this.peer) this.peer.stop();
    if (this.link) this.link.stop();
  }
}

const server = new Server('http://127.0.0.1:30001');
server.start();
