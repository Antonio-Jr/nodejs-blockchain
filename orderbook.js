const Lock = require('./lock')
const { EventEmitter } = require('events')
const { v4: uuidv4 } = require('uuid');

class OrderBook {
  constructor(pairs) {
    this.pairs = pairs;
    this.bid = {};
    this.ask = {};
    this.lock = new Lock();
    this.instance = uuidv4();
    this.emit = new EventEmitter();
  }

  addOrder(pair, side, price, amount) {
    this.lock.acquire();

    try {
      const orders = this[side][pair] || [];
      orders.push({ price, amount, instance: this.instance });
      this[side][pair] = orders;
    } finally {
      this.lock.release();
    }
  }

  removeOrder(pair, side, price, amount) {
    this.lock.acquire();

    try {
      const orders = this[side][pair];
      for (let i = 0; i < orders.length; i++) {
        if (orders[i].price === price && orders[i].amount === amount && orders[i].instance === this.instance ) {
          orders.splice(i, 1);
          break;
        }
      }
      if (orders.length === 0) {
        delete this[side][pair];
      } else {
        this[side][pair] = orders;
      }
    } finally {
      this.lock.release();
    }
  }

  getBestBid(pair) {
    return this.bid[pair] && this.bid[pair][0] ? this.bid[pair][0].price : null;
  }

  getBestAsk(pair) {
    return this.ask[pair] && this.ask[pair][0] ? this.ask[pair][0].price : null;
  }

  getDepth(pair) {
    const bid = this.bid[pair] || [];
    const ask = this.ask[pair] || [];
    return {
      bid,
      ask,
    };
  }

  getBook(){
    const response = {}
    for (const pair of this.pairs){
      response[pair] = this.getDepth(pair);
    }

    return response
  }

  update(book){
    const bid = this.bid;

    if (Object.keys(bid).length == 0 && !book?.bid) return;

    const bids = Object.values([...bid, ...book.bid].reduce((acc, { price, instance, amount }) => {
      acc[price] = { price, instance, amount: (acc[price] ? acc[price].amount : 0) + amount  };
      return acc;
    }, {}));

    this.bid[book.pair] = bids
    this.ask[book.pair] = book.ask
  }
}


module.exports = OrderBook