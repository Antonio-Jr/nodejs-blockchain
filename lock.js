const EventEmitter = require('events');

class Lock {
  constructor() {
    this.isLocked = false;
    this.emitter = new EventEmitter();
  }

  acquire() {
    if (!this.isLocked) {
      this.isLocked = true;
      return;
    }

    return new Promise((resolve) => {
      this.emitter.once('release', () => {
        this.isLocked = true;
        resolve();
      });
    });
  }

  release() {
    if (this.isLocked) {
      this.isLocked = false;
      this.emitter.emit('release');
    }
  }
}

module.exports = Lock