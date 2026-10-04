# opal-options: {"rubyspec_filters": ["A b"], "rubyspec_specials": true, "file": "core/a/b_spec.rb"}
describe "A" do
  it "b" do 1 end
  it "c" do 2 end
end
not_supported_on :opal do x end
not_supported_on :other do y end
platform_is :opal do z end
platform_is_not :windows do `w` end
fixture(__FILE__, "f.txt")
requirable_spec_file "a/b"
