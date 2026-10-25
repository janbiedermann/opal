// The message layer of the Language Server Protocol: JSON-RPC 2.0 builders
// and the protocol constants (port of ../protocol.rb). Messages are plain
// objects - transport.write stringifies them - so there is no wrapper
// class layer here.

export const ErrorCodes = {
  // https://microsoft.github.io/language-server-protocol/specifications/lsp/3_18/specification/#errorCodes
  PARSE_ERROR: -32700,
  INVALID_REQUEST: -32600,
  METHOD_NOT_FOUND: -32601,
  INVALID_PARAMS: -32602,
  INTERNAL_ERROR: -32603,
  // LSP-defined:
  SERVER_NOT_INITIALIZED: -32002,
  UNKNOWN_ERROR_CODE: -32001,
  REQUEST_CANCELLED: -32800,
};

// MessageType for window/logMessage and window/showMessage:
// 1=Error 2=Warning 3=Info 4=Log.
export function logMessage(type, message) {
  return { jsonrpc: "2.0", method: "window/logMessage", params: { type, message } };
}

export function notification(method, params) {
  if (params === undefined || params === null) {
    return { jsonrpc: "2.0", method };
  }
  return { jsonrpc: "2.0", method, params };
}

export function result(id, value) {
  return { jsonrpc: "2.0", id, result: value === undefined ? null : value };
}

export function error(id, code, message) {
  return { jsonrpc: "2.0", id, error: { code, message } };
}
