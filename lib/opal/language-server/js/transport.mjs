// The stdio transport: JSON-RPC messages behind Content-Length framing,
// the way VS Code launches a server. Port of ../transport.rb; the read
// and write bodies are that file's x-string JS verbatim, now at home.
//
// LSP counts UTF-8 bytes; JS strings are UTF-16, so the read accumulates
// raw bytes through fs.readSync and decodes each body with
// TextDecoder('utf8'), and the write frames by Buffer.byteLength. The
// writes use fs.writeSync, not process.stdout.write: the stdout pipe
// drains inline only up to its ~64KB capacity and would queue the rest
// as an async libuv write this synchronous loop never pumps (LSP.md
// §9 P7d - that was a deadlock).
import fs from "node:fs";

export class Transport {
  constructor() {
    this.frameBuf = Buffer.alloc(65536);
    this.pending = []; // bytes read but not yet part of a consumed frame
  }

  findSeparator(bytes) {
    for (let i = 0; i + 3 < bytes.length; i++) {
      if (bytes[i] === 13 && bytes[i + 1] === 10 && bytes[i + 2] === 13 && bytes[i + 3] === 10) return i;
    }
    return -1;
  }

  // One readSync into the pending bytes; 0 on EOF. EAGAIN (an O_NONBLOCK
  // pipe between frames) retries, as the node platform's io_read does.
  readMore() {
    const fd = 0; // process.stdin.fd
    for (;;) {
      try {
        const n = fs.readSync(fd, this.frameBuf, 0, this.frameBuf.length, null);
        for (let i = 0; i < n; i++) this.pending.push(this.frameBuf[i]);
        return n;
      } catch (e) {
        if (e.code === "EAGAIN") continue;
        return 0; // EOF, or a closed/invalid stdin
      }
    }
  }

  // The next framed message as a plain object, or null at end of input.
  // Throws SyntaxError on a malformed JSON body (the loop reports it).
  nextMessage() {
    const text = this.readFrame();
    if (text === null) return null;
    return JSON.parse(text);
  }

  readFrame() {
    // Headers end at CRLF CRLF; the header block itself is ASCII.
    let sep = this.findSeparator(this.pending);
    while (sep < 0) {
      if (this.readMore() === 0) return null;
      sep = this.findSeparator(this.pending);
    }
    const headers = Buffer.from(this.pending.slice(0, sep)).toString("latin1");
    const match = /content-length:\s*(\d+)/i.exec(headers);
    if (match === null) return null; // malformed stream
    const length = parseInt(match[1], 10);
    while (this.pending.length < sep + 4 + length) {
      if (this.readMore() === 0) return null;
    }
    const body = Buffer.from(this.pending.slice(sep + 4, sep + 4 + length));
    this.pending = this.pending.slice(sep + 4 + length);
    return new TextDecoder("utf-8").decode(body);
  }

  // Serialize and write one message (a plain object): the JSON body plus
  // its UTF-8 byte count, in one writeSync pass that blocks in-kernel
  // until the client's reads drain the pipe (EAGAIN just retries).
  write(message) {
    const json = JSON.stringify(message);
    const frame = Buffer.concat([
      Buffer.from("Content-Length: " + Buffer.byteLength(json, "utf8") + "\r\n\r\n", "ascii"),
      Buffer.from(json, "utf8"),
    ]);
    const fd = 1; // process.stdout.fd
    let off = 0;
    while (off < frame.length) {
      try {
        off += fs.writeSync(fd, frame, off, frame.length - off, null);
      } catch (e) {
        if (e.code !== "EAGAIN") throw e;
      }
    }
  }
}
