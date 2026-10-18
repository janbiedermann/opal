# backtick_javascript: true
# frozen_string_literal: true

# The English names of the global variables that are usually written as
# punctuation. CRuby builds them with `alias $ERROR_INFO $!`; Opal keeps its
# global variables in Opal.gvars, so the English name becomes an accessor on
# that object and stays in sync with the punctuation one, in both directions.
#
#   $ERROR_INFO::              $!     $LAST_MATCH_INFO::      $~
#   $ERROR_POSITION::          $@     $IGNORECASE::           $=
#   $FS::                      $;     $ARGV::                 $*
#   $FIELD_SEPARATOR::         $;     $MATCH::                $&
#   $OFS::                     $,     $PREMATCH::             $`
#   $OUTPUT_FIELD_SEPARATOR::  $,     $POSTMATCH::            $'
#   $RS::                      $/     $LAST_PAREN_MATCH::     $+
#   $INPUT_RECORD_SEPARATOR::  $/     $INPUT_LINE_NUMBER::    $.
#   $ORS::                     $\     $NR::                   $.
#   $OUTPUT_RECORD_SEPARATOR:: $\     $LAST_READ_LINE::       $_
#   $DEFAULT_OUTPUT::          $>     $DEFAULT_INPUT::        $<
#   $PID::                     $$     $PROCESS_ID::           $$
#   $CHILD_STATUS::            $?
#
module English
end

%x{
  // The back references aren't stored: the compiler reads $&, $`, $' and $+
  // off $~, so the English names have to do the same.
  function $back_ref(name) {
    var m = Opal.gvars['~'];
    if (m === undefined || m === Opal.nil) return Opal.nil;
    switch (name) {
      case '&': return m['$[]'](0);
      case '`': return m.$pre_match();
      case "'": return m.$post_match();
      case '+': return Opal.last_match_ref(m);
    }
  }

  var ENGLISH = {
    ERROR_INFO: '!',
    ERROR_POSITION: '@',
    FS: ';',
    FIELD_SEPARATOR: ';',
    OFS: ',',
    OUTPUT_FIELD_SEPARATOR: ',',
    RS: '/',
    INPUT_RECORD_SEPARATOR: '/',
    ORS: '\\',
    OUTPUT_RECORD_SEPARATOR: '\\',
    INPUT_LINE_NUMBER: '.',
    NR: '.',
    LAST_READ_LINE: '_',
    DEFAULT_OUTPUT: '>',
    DEFAULT_INPUT: '<',
    PID: '$',
    PROCESS_ID: '$',
    CHILD_STATUS: '?',
    LAST_MATCH_INFO: '~',
    IGNORECASE: '=',
    ARGV: '*',
    MATCH: function () { return $back_ref('&'); },
    PREMATCH: function () { return $back_ref('`'); },
    POSTMATCH: function () { return $back_ref("'"); },
    LAST_PAREN_MATCH: function () { return $back_ref('+'); },
  };

  for (var english in ENGLISH) {
    (function (english, global) {
      Object.defineProperty(Opal.gvars, english, {
        configurable: true,
        enumerable: false,
        get: typeof global === 'function' ? global : function () {
          var value = Opal.gvars[global];
          return value === undefined ? Opal.nil : value;
        },
        set: function (value) {
          if (typeof global === 'function') {
            #{::Kernel.raise ::ArgumentError, 'the English name of a read-only global variable'};
          }
          Opal.gvars[global] = value;
        },
      });
    })(english, ENGLISH[english]);
  }
}
