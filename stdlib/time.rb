# backtick_javascript: true

class Time
  def self.parse(str)
    %x{
      var d = Date.parse(str);
      if (d !== d) {
        // parsing failed, d is a NaN
        // probably str is not in ISO 8601 format, which is the only format, required to be supported by Javascript
        // try to make the format more like ISO or more like Chrome and parse again
        str = str.replace(/^(\d+)([\./])(\d+)([\./])?(\d+)?/, function(matched_sub, c1, c2, c3, c4, c5, offset, orig_string) {
          if ((c2 === c4) && c5) {
            // 2007.10.1 or 2007/10/1 are ok, but 2007/10.1 is not, convert to 2007-10-1
            return c1 + '-' + c3 + '-' + c5;
          } else if (c3 && !c4) {
            // 2007.10 or 2007/10
            // Chrome and Ruby can parse "2007/10", assuming its "2007-10-01", do the same
            return c1 + '-' + c3 + '-01';
          };
          return matched_sub;
        });
        d = Date.parse(str);
      }
      return new Date(d);
    }
  end

  ##
  # The ISO-8601 parser CRuby's Time.xmlschema and Time.iso8601 answer: the
  # extended date form, the time with or without its seconds and fraction, and
  # the zone as Z, z or a +HH:MM (or +HHMM) offset. A string with no date and no
  # time is the ArgumentError the callers of these two rescue. A string with no
  # zone is read as local time, as CRuby reads it.

  ISO8601_PATTERN = %r{
    \A
      (?:(\d{4})-(\d{2})-(\d{2}))?
      (?:[Tt ](\d{2}):(\d{2})(?::(\d{2})(?:[.,](\d+))?)?)?
      (?:\s*(Z|z|[+-]\d{2}:?\d{2}))?
    \z
  }x

  def self.xmlschema(str)
    match = ISO8601_PATTERN.match(str)
    year, month, day, hour, minute, second, fraction, zone = match && match.captures

    if year.nil? && hour.nil?
      raise ArgumentError, "no time information in #{str.inspect}"
    end

    # The fraction belongs to the second. Opal's Time keeps microseconds, so
    # digits past the sixth drop out the way they do when the second is read
    # back with #usec; CRuby keeps them as a Rational. A second of 60 (a leap
    # second) rolls into the next minute, which is what Date.UTC makes of it.
    usec = fraction && !fraction.empty? ? fraction[0, 6].ljust(6, "0").to_i : nil
    args = [year.to_i, (month || 1).to_i, (day || 1).to_i,
      hour.to_i, minute.to_i, second.to_i]

    if zone.nil?
      Time.local(*args, usec)
    else
      instant = Time.utc(*args, usec)
      offset = zone_offset(zone)
      offset.zero? ? instant : instant - offset
    end
  end

  def self.zone_offset(zone) # :nodoc:
    return 0 if zone == "Z" || zone == "z"

    # delete would read "+-" as a range, and that range covers the digits.
    digits = zone.gsub(/\D/, "")

    (zone.start_with?("-") ? -1 : 1) * (digits[0, 2].to_i * 3600 + digits[2, 2].to_i * 60)
  end

  class << self
    alias iso8601 xmlschema
  end

  def self.def_formatter(name, format, on_utc: false, utc_tz: nil, tz_format: nil, fractions: false, on: self)
    on.define_method name do |fdigits = 0|
      case self
      when defined?(::DateTime) && ::DateTime
        date = on_utc ? new_offset(0) : self
      when defined?(::Date) && ::Date
        date = ::Time.utc(year, month, day)
      when ::Time
        date = on_utc ? getutc : self
      end
      str = date.strftime(format)
      str += date.strftime(".%#{fdigits}N") if fractions && fdigits > 0
      if utc_tz
        str += utc ? utc_tz : date.strftime(tz_format)
      elsif tz_format
        str += date.strftime(tz_format)
      end
      str
    end
  end

  def_formatter :rfc2822, '%a, %d %b %Y %T ', utc_tz: '-00:00', tz_format: '%z'
  alias rfc822 rfc2822
  def_formatter :httpdate, '%a, %d %b %Y %T GMT', on_utc: true
  def_formatter :xmlschema, '%FT%T', utc_tz: 'Z', tz_format: '%:z', fractions: true
  alias iso8601 xmlschema

  def to_date
    Date.wrap(self)
  end

  def to_datetime
    DateTime.wrap(self)
  end

  def to_time
    self
  end
end

require 'date'
