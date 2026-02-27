let cache = null;

module.exports = {
  set(data) {
    cache = data;
  },
  get() {
    return cache;
  }
};
