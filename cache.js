'use strict';
const LRU = require('lru-cache');
const lmerge = require('lodash/merge');

class Cache {
  constructor(options){
    this.options = lmerge({
      prune: true,
      lru:{
        max: Infinity,
        maxAge: 5 * 60 * 1000
      },
      logger: function(...args) {
        console.log(...args);
      }
    });

    this.cache = new LRU(this.options.lru);

    if(this.options.prune){
      this.interval = setInterval(() => {
        cache.prune();
        this.log('We pruned old entries. Cache size: ', this.cache.length);
      }, this.options.lru.maxAge);
    }
  }

  get(...args){
    this.log('Get entry: ', ...args);
    return this.cache.get(...args);
  }

  set(key, src, dest){
    this.log('Set a new entry: ', key);
    const has = this.cache.has(key);
    if(has && src === null){
      this.log('* new entry has the object but has no source. Add the source to the element.');
      this.cache.set(key, {
        source:this.cache.get(key).source,
        dest
      });
    } else if(!has && dest === null) {
      this.log('* new entry has no source. Add to the cache with no destination.');
      this.cache.set(key, {
        source:src,
        dest:null
      });
    }
  }

  log(...args) {
    this.options.logger(...args);
  }
}

module.exports = Cache;
