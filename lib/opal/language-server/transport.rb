# backtick_javascript: true
require 'json'
require 'opal/language-server/protocol'

module Opal
  module LanguageServer
    # The stdio transport: JSON-RPC messages behind Content-Length framing,
    # the way VS Code launches a server (it spawns it and pipes stdio).
    #
    # The framing is byte-exact JavaScript: LSP counts UTF-8 *bytes*, while
    # Opal strings are UTF-16 code units, so the read accumulates raw bytes
    # through node's fs and decodes each body with TextDecoder('utf-8')
    # (the AGENTS.md lesson on reading text out of bytes); the write encodes
    # with Buffer.byteLength. Synchronous reads block until a frame is
    # complete - the single-threaded server loop the whole design leans on.
    class Transport
      %x{
        var $frameBuf = Buffer.alloc(65536);
        var $pending = []; // bytes received but not yet part of a consumed frame

        function $findSeparator(bytes) {
          for (var i = 0; i + 3 < bytes.length; i++) {
            if (bytes[i] === 13 && bytes[i + 1] === 10 &&
                bytes[i + 2] === 13 && bytes[i + 3] === 10) return i;
          }
          return -1;
        }

        // One readSync into the pending bytes; 0 on EOF. EAGAIN (an
        // O_NONBLOCK pipe between frames) retries, as the node platform's
        // io_read does.
        function $readMore() {
          var fd = process.stdin.fd;
          for (;;) {
            try {
              var n = Opal.platform.modules.fs.readSync(fd, $frameBuf, 0, $frameBuf.length, null);
              for (var i = 0; i < n; i++) $pending.push($frameBuf[i]);
              return n;
            } catch (e) {
              if (e.code === 'EAGAIN') continue;
              return 0; // EOF, or a closed/invalid stdin
            }
          }
        }
      }

      # The next framed message as a Hash with String keys, or nil at end
      # of input (stdin closed). Raises JSON::ParserError on a malformed
      # body so the loop can report it.
      def next_message
        text = read_frame
        return nil if text.nil?
        JSON.parse(text)
      end

      def read_frame
        %x{
          // Headers end at CRLF CRLF; the header block itself is ASCII.
          var sep = $findSeparator($pending);
          while (sep < 0) {
            if ($readMore() === 0) return nil;
            sep = $findSeparator($pending);
          }
          var headers = Buffer.from($pending.slice(0, sep)).toString('latin1');
          var match = /content-length:\s*(\d+)/i.exec(headers);
          if (match == null) return nil; // malformed stream
          var length = parseInt(match[1], 10);
          while ($pending.length < sep + 4 + length) {
            if ($readMore() === 0) return nil;
          }
          var body = Buffer.from($pending.slice(sep + 4, sep + 4 + length));
          $pending = $pending.slice(sep + 4 + length);
          return new TextDecoder('utf-8').decode(body);
        }
      end

      # Serialize and write one message (a Hash or a protocol Message —
      # both answer to_h): the JSON body plus its UTF-8 byte count.
      def write(message)
        json = message.to_h.to_json
        %x{
          var text = String(#{json});
          process.stdout.write(
            "Content-Length: " + Buffer.byteLength(text, "utf8") + "\r\n\r\n" + text);
        }
        nil
      end
    end
  end
end
