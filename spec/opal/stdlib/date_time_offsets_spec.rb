require 'spec_helper'
require 'date'

# Offsets of DateTime (whatever the local time zone)
describe "DateTime offsets" do
  it "keeps the class and the offset when cloned" do
    d = DateTime.new(2012, 11, 8, 15, 43, 59, '+05:30')
    d.clone.class.should == DateTime
    d.offset.should == Rational(11, 48)
    d.new_offset(0).to_s.should == "2012-11-08T10:13:59+00:00"
    d.new_offset('-03:00').to_s.should == "2012-11-08T07:13:59-03:00"
  end

  it "takes a numeric offset as a fraction of a day" do
    d = DateTime.new(2012, 11, 8, 15, 43, 59, Rational(11, 48))
    d.to_s.should == "2012-11-08T15:43:59+05:30"
    d.new_offset(Rational(-1, 24)).to_s.should == "2012-11-08T09:13:59-01:00"
  end

  it "parses times with a zone in that zone" do
    DateTime.parse("2012-11-08T15:43:59+05:30").to_s.should == "2012-11-08T15:43:59+05:30"
    DateTime.parse("2012-11-08T15:43:59Z").to_s.should == "2012-11-08T15:43:59+00:00"
    DateTime.parse("Thu, 08 Nov 2012 15:43:59 GMT").to_s.should == "2012-11-08T15:43:59+00:00"
    DateTime.parse("2012-11-08 15:43:59 EST").to_s.should == "2012-11-08T15:43:59-05:00"
    DateTime.parse("2012-11-08T15:43:59-0800").offset.should == Rational(-1, 3)
  end

  it "gives Time#utc_offset in seconds" do
    Time.new(2012, 11, 8, 15, 43, 59, '+05:30').utc_offset.should == 19800
    Time.new(2012, 11, 8, 15, 43, 59, -10800).utc_offset.should == -10800
  end
end
