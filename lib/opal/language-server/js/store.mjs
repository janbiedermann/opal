// The open documents, keyed by their LSP uri (port of ../store.rb).
export class Store {
  constructor() {
    this.documents = new Map();
  }

  get(uri) {
    return this.documents.get(uri) ?? null;
  }

  set(document) {
    this.documents.set(document.uri, document);
  }

  has(uri) {
    return this.documents.has(uri);
  }

  delete(uri) {
    this.documents.delete(uri);
  }

  each(fn) {
    for (const document of this.documents.values()) fn(document);
  }

  get size() {
    return this.documents.size;
  }
}
