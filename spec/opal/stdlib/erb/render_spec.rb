require 'opal-parser'

describe "Opal::ERB.render" do
  it "renders a Ruby ERB template" do
    Opal::ERB.render("a <%= 1 + 1 %> b").should == "a 2 b"
    Opal::ERB.render("<% 2.times do |i| %>[<%= i %>]<% end %>").should == "[0][1]"
    Opal::ERB.render("<%# comment %>x <%% y").should == "x <% y"
  end

  it "uses the given file name" do
    Opal::ERB.render("<%= __FILE__ %>", "t.erb").should == "t.erb"
  end

  it "raises a SyntaxError for invalid code" do
    -> { Opal::ERB.render("<%= 1 + %>") }.should raise_error(SyntaxError)
  end
end
