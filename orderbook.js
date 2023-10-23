const Lock = require('./lock');

class OrderBook {
  constructor(pairs, emiter) {
    this.pairs = pairs;
    this.bid = {};
    this.ask = {};
    this.lock = new Lock();
    this.eventEmitter = emiter
    this.isSynced = true
  }

  addOrder(pair, side, price, amount) {
    this.lock.acquire();

    try {
      if (this.sumExistingOrders(pair, side, price, amount)) return;

      const orders = this[side][pair] || [];
      orders.push({ price, amount });
      this[side][pair] = orders;
      this.isSynced = false
      if (this.eventEmitter) this.eventEmitter.emit('updateBook')
    } finally {
      this.lock.release();
    }
  }

  removeOrder(pair, side, price, amount) {
    this.lock.acquire();
    
    try {
      const orders = this[side][pair];
      const index = orders.findIndex(order => order.price === price && order.amount === amount);
      if (index !== -1) {
        orders.splice(index, 1);
        if (orders.length === 0) {
          delete this[side][pair];
        }
      }
      
      this.isSynced = false
      if (this.eventEmitter) this.eventEmitter.emit('updateBook')
    } finally {
      this.lock.release();
    }
  }

  getBestPrice(pair, side) {
    const topOrder = this[side][pair] && this[side][pair][0];
    return topOrder ? topOrder.price : null;
  }

  getDepth(pair) {
    return {
      bid: this.bid[pair] || [],
      ask: this.ask[pair] || [],
    };
  }

  getBook() {
    const response = {};
    for (const pair of this.pairs) {
      response[pair] = this.getDepth(pair);
    }
    return response;
  }

  update(book) {
    if (!book || this.isSynced) return;

    for (const pair of Object.keys(book)){
      const { bid, ask } = book[pair];

      if (bid && bid.length > 0) {
        for (const newBid of bid) {
          this.addOrder(pair, 'bid', newBid.price, newBid.amount);
        }
      }

      if (ask && ask.length > 0) {
        for (const newAsk of ask) {
          this.addOrder(pair, 'ask', newAsk.price, newAsk.amount);
        }
      }
      this.matchOrders(pair);
      this.isSynced = true
    }
  }

  matchOrders(pair) {
    if (!this.bid[pair] || !this.ask[pair]) {
      return;
    }

    const bids = this.bid[pair];
    const asks = this.ask[pair];

    let i = 0;
    let j = 0;

    while (i < bids.length && j < asks.length) {
      const bid = bids[i];
      const ask = asks[j];

      if (bid.price >= ask.price) {
        const matchedAmount = Math.min(bid.amount, ask.amount);
        bid.amount -= matchedAmount;
        ask.amount -= matchedAmount;

        if (bid.amount === 0) {
          bids.splice(i, 1);
        }

        if (ask.amount === 0) {
          asks.splice(j, 1);
        }
      }

      if (bid.amount <= 0) {
        i++;
      }
      if (ask.amount <= 0) {
        j++;
      }
    }
  }

  sumExistingOrders(pair, side, price, amount) {
    if (!this[side][pair]) {
      return false;
    }
      
    const orders = this[side][pair];

    for (let i = 0; i < orders.length; i++) {
      if (orders[i].price === price) {
        orders[i].amount += amount;
        this[side][pair] = orders
        return true;
      }
    }

    return false;
  }
}

module.exports = OrderBook;