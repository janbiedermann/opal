# backtick_javascript: true

module OpenURI
  # (unxhr, an npm package, is loaded on the first request, see Dir)
  `var __unxhr__ = null`

  def self.request(uri)
    %x{
      if (!__unxhr__) __unxhr__ = require('unxhr');
      var xhr = new __unxhr__.XMLHttpRequest();
      xhr.open('GET', uri, false);
      xhr.responseType = 'arraybuffer';
      xhr.send();
      return xhr;
    }
  end

  def self.data(req)
    %x{
      var arrayBuffer = req.response;
      var byteArray = new Uint8Array(arrayBuffer);
      var result = []
      for (var i = 0; i < byteArray.byteLength; i++) {
        result.push(byteArray[i]);
      }
      return result;
    }
  end
end
