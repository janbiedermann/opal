# backtick_javascript: true

class DateTime < Date
  class << self
    def now
      wrap Time.now
    end

    # @private
    # An offset as Time takes it: a numeric offset of a DateTime is a
    # fraction of a day (Rational(11, 48) is +05:30).
    def _offset_seconds(offset)
      ::Numeric === offset ? (offset * 86_400).round : offset
    end

    # @private
    # The offset (in seconds) a time string ends with, if any: numeric,
    # Z/UTC/GMT/UT, or the US zones of RFC 2822 (which Date.parse knows).
    ZONE_OFFSETS = { 'Z' => 0, 'UTC' => 0, 'GMT' => 0, 'UT' => 0, 'EST' => -5, 'EDT' => -4, 'CST' => -6, 'CDT' => -5,
                     'MST' => -7, 'MDT' => -6, 'PST' => -8, 'PDT' => -7 }.freeze
    def _zone_offset(str)
      if (m = str.match(/(?:\d|\s)(?:UTC|GMT)?([+-])(\d\d):?(\d\d)\s*\z/))
        (m[1] == '-' ? -1 : 1) * (m[2].to_i * 3600 + m[3].to_i * 60)
      elsif (m = str.match(/(?:\d|\s)([A-Z]{1,3})\s*\z/)) && ZONE_OFFSETS.key?(m[1])
        ZONE_OFFSETS[m[1]] * 3600
      end
    end

    # A time without a zone is at offset 0 (UTC), as in CRuby (Time.parse
    # takes it as local time): the string is parsed as a UTC time.
    def parse(str)
      utc = `Date.parse(str + (/\dT\d/.test(str) ? "Z" : " UTC"))` unless `/\d:\d\d(?::\d\d(?:[.,]\d+)?)?\s*(?:Z|[+-]\d{1,2}(?::?\d\d)?|(?!AM\b|PM\b)[A-Z]{2,5})\s*$/.test(str)`
      if utc.nil?
        # (a zone: the time in it)
        offset = _zone_offset(str)
        return offset ? wrap(Time.parse(str)).new_offset(Rational(offset, 86_400)) : wrap(Time.parse(str))
      end
      return wrap Time.parse(str) if `isNaN(utc)`

      wrap Time.at(`utc / 1000`).utc
    end
  end

  def initialize(year = -4712, month = 1, day = 1, hours = 0, minutes = 0, seconds = 0, offset = 0, start = ITALY)
    %x{
      // Because of Gregorian reform calendar goes from 1582-10-04 to 1582-10-15.
      // All days in between end up as 4 october.
      if (year === 1582 && month === 10 && day > 4 && day < 15) {
        day = 4;
      }
    }

    @date = Time.new(year, month, day, hours, minutes, seconds, ::DateTime._offset_seconds(offset))
    @start = start
  end

  def_delegators :@date, :min, :hour, :sec
  alias minute min
  alias second sec

  def sec_fraction
    @date.usec/1_000_000r
  end

  alias second_fraction sec_fraction

  def offset
    @date.gmt_offset / (24 * 3600r)
  end

  def +(other)
    ::DateTime.wrap @date + other
  end

  def -(other)
    `if (Opal.is_a(other, #{::Date})) other = other.date`
    result = @date - other
    if result.is_a? ::Time
      ::DateTime.wrap result
    else
      result
    end
  end

  def new_offset(offset = 0)
    new_date = clone
    offset = Time._parse_offset(::DateTime._offset_seconds(offset))
    `new_date.date.timezone = offset`
    new_date
  end

  def to_datetime
    self
  end

  def to_time
    @date.dup
  end

  def to_date
    Date.new(year, month, day)
  end
end
